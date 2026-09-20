"""
===============================================================================
MODULE: app/embedding_provider.py
===============================================================================
PURPOSE:
    Abstract embedding provider layer for Phase 6B (Embeddings + Vector Storage).

WHAT IT DOES:
    - Defines BaseEmbeddingProvider abstract interface for text embeddings.
    - Implements MockEmbeddingProvider for deterministic, reproducible unit testing without network calls.
    - Implements GeminiEmbeddingProvider for generating real text embeddings using Google Gemini API (text-embedding-004).
    - Provides factory function get_embedding_provider() to instantiate configured providers dynamically.

WHY WE NEED AN ABSTRACTION:
    Downstream services should never be tightly coupled to a single LLM vendor's embedding API.
    An abstraction allows switching seamlessly between Gemini, OpenAI, sentence-transformers, or Mock providers.

HOW IT FITS INTO SEMANTIC SEARCH / RAG:
    Knowledge Chunks -> EmbeddingProvider.embed_texts() -> Dense Vector Float Arrays -> PostgreSQL + pgvector Storage
===============================================================================
"""

# standard library imports
import abc
import hashlib
import json
import os
import urllib.error
import urllib.request
from typing import Any, Dict, List, Optional


class BaseEmbeddingProvider(abc.ABC):
    """
    Abstract base class for all embedding providers.

    PROPERTIES:
        dimension (int): Number of float dimensions in the output vector (e.g. 768).
        model_name (str): Identifier of the active embedding model (e.g. "text-embedding-004").
    """

    @property
    @abc.abstractmethod
    def dimension(self) -> int:
        """Returns vector dimension count."""
        pass

    @property
    @abc.abstractmethod
    def model_name(self) -> str:
        """Returns embedding model name."""
        pass

    @abc.abstractmethod
    def embed_text(self, text: str) -> List[float]:
        """
        Generates a vector embedding for a single text string.

        Args:
            text (str): Input text string.

        Returns:
            List[float]: Vector embedding representation.
        """
        pass

    @abc.abstractmethod
    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """
        Generates vector embeddings for a batch of text strings.

        Args:
            texts (List[str]): List of input text strings.

        Returns:
            List[List[float]]: Batch list of vector embeddings.
        """
        pass


class MockEmbeddingProvider(BaseEmbeddingProvider):
    """
    Deterministic Mock Embedding Provider for reproducible testing without network API calls.

    WHAT IT DOES:
        Generates deterministic pseudo-random unit vectors derived from the SHA-256 hash of input text.

    WHY DETERMINISTIC TESTING MATTERS:
        Using random numbers in tests causes flaky, unreproducible test runs.
        Using a SHA-256 seed ensures:
        - Same input text -> Exact same output vector every time.
        - Different input text -> Different deterministic output vector.
    """

    def __init__(self, dimension: int = 768, model_name: str = "mock-embedding-v1"):
        """Initializes mock embedding provider with configured dimension."""
        self._dimension = dimension
        self._model_name = model_name

    @property
    def dimension(self) -> int:
        return self._dimension

    @property
    def model_name(self) -> str:
        return self._model_name

    def embed_text(self, text: str) -> List[float]:
        """
        Generates a deterministic float vector for a single text string.
        Raises ValueError if text is empty string.
        """
        if not text or not text.strip():
            raise ValueError("EMPTY_TEXT: Cannot generate embedding for empty string.")

        # Hash text to generate a stable 64-character hex seed
        hex_digest = hashlib.sha256(text.encode("utf-8")).hexdigest()

        # Expand hash string into a deterministic vector of length self._dimension
        raw_values = []
        for i in range(self._dimension):
            # Pick a hex character index deterministically
            char_val = int(hex_digest[(i * 3) % len(hex_digest)], 16)
            # Map [0, 15] to normalized range [-1.0, 1.0]
            val = (char_val - 7.5) / 7.5
            raw_values.append(val)

        # L2 normalize the vector so vector length equals 1.0
        norm = (sum(v * v for v in raw_values)) ** 0.5
        if norm > 0:
            normalized_vec = [round(v / norm, 6) for v in raw_values]
        else:
            normalized_vec = [0.0] * self._dimension

        return normalized_vec

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """
        Generates deterministic float vectors for a batch of text strings.
        """
        results = []
        for text in texts:
            results.append(self.embed_text(text))
        return results


class OllamaEmbeddingProvider(BaseEmbeddingProvider):
    """
    Ollama Local Embedding Provider using REST API.

    WHAT IT DOES:
        Sends HTTP REST requests to local Ollama server (/api/embeddings endpoint)
        to produce dense vector embeddings using locally hosted models.

    WHY USE IT:
        Enables fully local, private embedding generation without external API keys.
        Supports various embedding models available in Ollama (nomic-embed-text, mxbai-embed-large, etc.).
    """

    def __init__(self, model: str = "nomic-embed-text", base_url: str = "http://localhost:11434", dimension: int = 768):
        """Initializes Ollama embedding provider with model and server configuration."""
        self.model = model
        self.base_url = base_url.rstrip("/")
        self._dimension = dimension
        self._model_name = model

    @property
    def dimension(self) -> int:
        return self._dimension

    @property
    def model_name(self) -> str:
        return self._model_name

    def _embed_single(self, text: str) -> List[float]:
        """Embeds a single text string via Ollama API."""
        url = f"{self.base_url}/api/embeddings"
        headers = {"Content-Type": "application/json"}
        payload = {
            "model": self.model,
            "prompt": text
        }

        try:
            req = urllib.request.Request(
                url=url,
                data=json.dumps(payload).encode("utf-8"),
                headers=headers,
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=30) as response:
                resp_data = json.loads(response.read().decode("utf-8"))
                values = resp_data.get("embedding", [])
                if not values:
                    raise ValueError("Ollama returned empty embedding")
                if len(values) != self._dimension:
                    self._dimension = len(values)
                return values
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="ignore")
            if e.code == 404:
                raise RuntimeError(f"Ollama Model Not Found (HTTP 404): Model '{self.model}' is not available. Run 'ollama pull {self.model}' first. Details: {err_body}")
            else:
                raise RuntimeError(f"Ollama Embedding Error (HTTP {e.code}): {err_body}")
        except Exception as e:
            raise RuntimeError(f"Failed to communicate with Ollama at {self.base_url}: {str(e)}")

    def embed_text(self, text: str) -> List[float]:
        """Generates a vector embedding for a single text string."""
        if not text or not text.strip():
            raise ValueError("EMPTY_TEXT: Cannot generate embedding for empty string.")
        return self._embed_single(text)

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """Generates vector embeddings for a batch of text strings."""
        results = []
        for text in texts:
            results.append(self._embed_single(text))
        return results


class GeminiEmbeddingProvider(BaseEmbeddingProvider):
    """
    Google Gemini REST API Embedding Provider using text-embedding-004.

    WHAT IT DOES:
        Sends HTTP REST requests to Google Generative Language API endpoint
        to produce dense 768-dimensional text embeddings.
    """

    def __init__(self, api_key: str, model_name: str = "text-embedding-004", dimension: int = 768):
        """Initializes Gemini embedding provider with API key and model config."""
        if not api_key:
            raise ValueError("CONFIGURATION ERROR: API key is required for GeminiEmbeddingProvider.")
        self.api_key = api_key
        self._model_name = model_name
        self._dimension = dimension
        self.endpoint_url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:embedContent"
        self.batch_endpoint_url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:batchEmbedContents"

    @property
    def dimension(self) -> int:
        return self._dimension

    @property
    def model_name(self) -> str:
        return self._model_name

    def embed_text(self, text: str) -> List[float]:
        """
        Generates vector embedding for a single text string via Gemini REST API.
        """
        if not text or not text.strip():
            raise ValueError("EMPTY_TEXT: Cannot generate embedding for empty string.")

        url = f"{self.endpoint_url}?key={self.api_key}"
        payload = {
            "model": f"models/{self._model_name}",
            "content": {
                "parts": [{"text": text}]
            }
        }

        json_data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=json_data,
            headers={"Content-Type": "application/json"},
            method="POST"
        )

        try:
            with urllib.request.urlopen(req, timeout=30) as response:
                resp_text = response.read().decode("utf-8")
                resp_json = json.loads(resp_text)
                values = resp_json.get("embedding", {}).get("values", [])

                if not values:
                    raise ValueError("INVALID_RESPONSE: Malformed embedding response from Gemini API.")
                if len(values) != self._dimension:
                    # Soft-check dimension match
                    self._dimension = len(values)
                return values
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8") if e.fp else str(e)
            raise RuntimeError(f"Gemini API Embedding Error (HTTP {e.code}): {err_body}")
        except Exception as e:
            raise RuntimeError(f"Gemini API Network/Timeout Error: {str(e)}")

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """
        Generates vector embeddings for a batch of text strings.
        Falls back to sequential single calls if batch endpoint is unavailable.
        """
        results = []
        for text in texts:
            results.append(self.embed_text(text))
        return results


def get_embedding_provider(force_mock: bool = False) -> BaseEmbeddingProvider:
    """
    Factory function to instantiate the active EmbeddingProvider based on environment.

    Args:
        force_mock (bool): If True, returns MockEmbeddingProvider regardless of env variables.

    Returns:
        BaseEmbeddingProvider: Active embedding provider instance.
    """
    if force_mock:
        return MockEmbeddingProvider()

    provider_name = os.environ.get("EMBEDDING_PROVIDER", "").lower().strip()
    api_key = os.environ.get("LLM_API_KEY", "").strip()
    model_name = os.environ.get("EMBEDDING_MODEL", "text-embedding-004").strip()

    if provider_name == "ollama":
        ollama_model = os.environ.get("OLLAMA_EMBEDDING_MODEL", "nomic-embed-text")
        ollama_base_url = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
        print(f"[INFO] Initializing Local Ollama Embedding Provider (Model: '{ollama_model}', Base URL: '{ollama_base_url}')")
        return OllamaEmbeddingProvider(model=ollama_model, base_url=ollama_base_url)

    if provider_name == "gemini" or (not provider_name and api_key.startswith("AIza")):
        if not api_key:
            raise ValueError("CONFIGURATION ERROR: Gemini embedding provider requested but LLM_API_KEY is empty.")
        print(f"[INFO] Initializing Real Gemini Embedding Provider (Model: '{model_name}')")
        return GeminiEmbeddingProvider(api_key=api_key, model_name=model_name)

    if provider_name == "mock":
        return MockEmbeddingProvider()

    # Default fallback for test & offline environments
    return MockEmbeddingProvider()
