
"""
===============================================================================
MODULE: app/llm_client.py
===============================================================================
PURPOSE:
    Provides an extensible LLM Client abstraction layer for Phase 2 requirement extraction.

WHAT IT DOES:
    - Defines BaseLLMProvider abstract interface contract.
    - Implements GeminiLLMProvider for Google Gemini API endpoints.
    - Implements OpenAILLMProvider for OpenAI/OpenAI-compatible endpoints.
    - Implements MockLLMProvider for offline deterministic testing.
    - Provides load_env_file() to auto-load .env environment variables safely.
    - Implements get_llm_client() factory function that reads environment configuration
      (LLM_PROVIDER, LLM_API_KEY, LLM_MODEL) and enforces explicit provider selection.

WHY WE NEED IT:
    Decouples LLM vendor implementations from the requirement extraction pipeline.
    Allows switching between Gemini, OpenAI, or Mock modes purely via environment config,
    while ensuring real LLM mode never silently degrades to mock mode when errors occur.

HOW IT FITS INTO THE PIPELINE:
    RequirementExtractor -> get_llm_client() -> LLMProvider.generate_json() -> raw JSON string
===============================================================================
"""

# standard library imports
from abc import ABC, abstractmethod
import json
import os
import re
import urllib.request
import urllib.error
from pathlib import Path
from typing import Any, Dict, List, Optional, Union


def load_env_file(env_path: Optional[Union[str, Path]] = None) -> None:
    """
    Lightweight environment file (.env) loader using standard Python.

    WHAT: Reads key=value pairs from a .env file and sets them in os.environ if not set.
    WHY: Enables local development configuration without requiring external dependencies (like python-dotenv).
    HOW: Searches project root for .env, parses lines, strips quotes, and populates os.environ.
    """
    if env_path is None:
        # Default search path: ai-service/.env or current working directory .env
        project_root = Path(__file__).resolve().parent.parent
        possible_paths = [
            project_root / ".env",
            Path.cwd() / ".env",
        ]
        for p in possible_paths:
            if p.exists():
                env_path = p
                break

    if env_path and Path(env_path).exists():
        try:
            content = Path(env_path).read_text(encoding="utf-8")
            for line in content.splitlines():
                line = line.strip()
                # Skip comments and empty lines
                if not line or line.startswith("#"):
                    continue
                if "=" in line:
                    key, value = line.split("=", 1)
                    key = key.strip()
                    value = value.strip().strip("'\"")
                    # Do not overwrite environment variables explicitly passed in CLI
                    if key and key not in os.environ:
                        os.environ[key] = value
        except Exception:
            pass


class BaseLLMProvider(ABC):
    """
    Abstract base class defining the contract for all LLM providers.

    WHAT: Interface requiring all providers to implement generate_json().
    WHY: Ensures requirement_extractor.py works against a uniform API regardless of vendor.
    """

    @abstractmethod
    def generate_json(self, prompt: str, system_prompt: str) -> str:
        """
        Sends a system and user prompt to the LLM and returns the raw JSON string response.

        Args:
            prompt (str): Formatted user prompt containing tender text.
            system_prompt (str): System prompt containing extraction rules & schema.

        Returns:
            str: Raw JSON string response produced by the model.
        """
        pass


class OpenAILLMProvider(BaseLLMProvider):
    """
    LLM Provider for OpenAI Chat Completion API (GPT-4o, GPT-3.5-Turbo) or compatible endpoints.

    WHAT: Sends HTTPS POST requests to OpenAI /v1/chat/completions using standard urllib.
    WHY: Uses native Python standard library to avoid external SDK version mismatches.
    HOW: Configures json_object response format, authorization header, and parses response.
    """

    def __init__(self, api_key: str, model: str = "gpt-4o-mini", api_base: Optional[str] = None):
        """
        Initializes OpenAI LLM Provider with credentials and model configuration.
        """
        self.api_key = api_key
        self.model = model
        self.api_base = (api_base or "https://api.openai.com/v1").rstrip("/")

    def generate_json(self, prompt: str, system_prompt: str) -> str:
        url = f"{self.api_base}/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
        }
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt},
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.0,
        }

        try:
            req = urllib.request.Request(
                url=url,
                data=json.dumps(payload).encode("utf-8"),
                headers=headers,
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=45) as response:
                resp_data = json.loads(response.read().decode("utf-8"))
                return resp_data["choices"][0]["message"]["content"]
        except urllib.error.HTTPError as e:
            error_body = e.read().decode("utf-8", errors="ignore")
            if e.code == 401:
                raise RuntimeError(f"OpenAI Authentication Error (HTTP 401): Invalid API key provided. Details: {error_body}")
            elif e.code == 404:
                raise RuntimeError(f"OpenAI Model Not Found (HTTP 404): Model '{self.model}' is unavailable. Details: {error_body}")
            elif e.code == 429:
                raise RuntimeError(f"OpenAI Quota Exceeded (HTTP 429): Rate limit or quota exhausted. Details: {error_body}")
            else:
                raise RuntimeError(f"OpenAI API Error (HTTP {e.code}): {error_body}")
        except Exception as e:
            raise RuntimeError(f"Failed to communicate with OpenAI API: {str(e)}")


class GeminiLLMProvider(BaseLLMProvider):
    """
    LLM Provider for Google Gemini API (gemini-1.5-flash, gemini-1.5-pro, gemini-2.0-flash, etc.).

    WHAT: Communicates directly with Google Gemini REST API using urllib.
    WHY: Native REST integration for Google AI Gemini models without external library friction.
    HOW: Sends structured payload with response_mime_type="application/json" to force JSON output.
    """

    def __init__(self, api_key: str, model: str = "gemini-3.5-flash"):
        self.api_key = api_key
        self.model = model

    def generate_json(self, prompt: str, system_prompt: str) -> str:
        import time
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"
        headers = {"Content-Type": "application/json"}
        payload = {
            "system_instruction": {"parts": [{"text": system_prompt}]},
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "response_mime_type": "application/json",
                "temperature": 0.0,
            },
        }

        max_attempts = 3
        last_exception = None

        for attempt in range(1, max_attempts + 1):
            try:
                req = urllib.request.Request(
                    url=url,
                    data=json.dumps(payload).encode("utf-8"),
                    headers=headers,
                    method="POST",
                )
                with urllib.request.urlopen(req, timeout=45) as response:
                    resp_data = json.loads(response.read().decode("utf-8"))
                    candidates = resp_data.get("candidates", [])
                    if not candidates:
                        raise RuntimeError("Gemini returned response with no candidate completions.")
                    
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if not parts:
                        raise RuntimeError("Gemini response candidate contains no text parts.")

                    text_content = parts[0].get("text", "")
                    return text_content
            except urllib.error.HTTPError as e:
                error_body = e.read().decode("utf-8", errors="ignore")
                if e.code == 400:
                    raise RuntimeError(f"Gemini API Invalid Request (HTTP 400): Check API Key or Request Schema. Details: {error_body}")
                elif e.code == 403 or e.code == 401:
                    raise RuntimeError(f"Gemini API Authentication Error (HTTP {e.code}): Invalid API Key or access forbidden. Details: {error_body}")
                elif e.code == 404:
                    raise RuntimeError(f"Gemini API Model Not Found (HTTP 404): Model '{self.model}' is unavailable or invalid. Details: {error_body}")
                elif e.code == 429:
                    if attempt < max_attempts:
                        time.sleep(10 * attempt)
                        continue
                    raise RuntimeError(f"Gemini API Quota Exceeded (HTTP 429): Rate limit or quota exhausted. Details: {error_body}")
                else:
                    raise RuntimeError(f"Gemini API Error (HTTP {e.code}): {error_body}")
            except Exception as e:
                last_exception = e
                if attempt < max_attempts:
                    time.sleep(1.5 * attempt)
                else:
                    raise RuntimeError(f"Failed to communicate with Gemini API: {str(last_exception)}")


class OllamaLLMProvider(BaseLLMProvider):
    """
    LLM Provider for local Ollama API.

    WHAT: Communicates with local Ollama server via REST API for completion.
    WHY: Enables fully local, private LLM inference without external API keys.
    HOW: Sends requests to /api/generate endpoint with JSON output format enforcement.
    """

    def __init__(self, model: str = "qwen2.5:3b", base_url: str = "http://localhost:11434"):
        self.model = model
        self.base_url = base_url.rstrip("/")

    def generate_json(self, prompt: str, system_prompt: str) -> str:
        url = f"{self.base_url}/api/generate"
        headers = {"Content-Type": "application/json"}
        payload = {
            "model": self.model,
            "system": system_prompt,
            "prompt": prompt,
            "format": "json",
            "stream": False,
            "options": {
                "temperature": 0.0,
                "num_predict": 2048
            }
        }

        try:
            req = urllib.request.Request(
                url=url,
                data=json.dumps(payload).encode("utf-8"),
                headers=headers,
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=300) as response:
                resp_data = json.loads(response.read().decode("utf-8"))
                text_content = resp_data.get("response", "")
                return text_content
        except urllib.error.HTTPError as e:
            error_body = e.read().decode("utf-8", errors="ignore")
            if e.code == 404:
                raise RuntimeError(f"Ollama Model Not Found (HTTP 404): Model '{self.model}' is not available. Run 'ollama pull {self.model}' first. Details: {error_body}")
            else:
                raise RuntimeError(f"Ollama API Error (HTTP {e.code}): {error_body}")
        except Exception as e:
            raise RuntimeError(f"Failed to communicate with Ollama at {self.base_url}: {str(e)}")

    def health_check(self) -> bool:
        """Check if Ollama server is reachable and model is available."""
        try:
            url = f"{self.base_url}/api/tags"
            req = urllib.request.Request(url=url, method="GET")
            with urllib.request.urlopen(req, timeout=5) as response:
                resp_data = json.loads(response.read().decode("utf-8"))
                models = [m.get("name", "") for m in resp_data.get("models", [])]
                return self.model in models or any(m.startswith(self.model.split(":")[0]) for m in models)
        except Exception:
            return False


class MockLLMProvider(BaseLLMProvider):
    """
    Rule-assisted deterministic Mock LLM Provider for offline local testing and fallback.

    WHAT:
        Simulates an LLM response by parsing text for specific tender patterns when
        offline development mode or unit testing is explicitly requested.

    WHY:
        Allows the entire Phase 2 pipeline and unit test suite to run deterministically
        without depending on external network connectivity or paid API keys.

    HOW:
        Applies regular expression rules for common tender clauses (turnover, ISO, EMD,
        GST, experience, PDF format) and formats matching items into valid JSON output.
    """

    def __init__(self, notice_message: str = "Using rule-assisted Mock LLM Provider (Offline Mode)"):
        self.notice_message = notice_message

    def generate_json(self, prompt: str, system_prompt: str) -> str:
        """
        Parses text in user prompt and extracts requirements deterministically.
        """
        if "TRIGGER_LLM_TIMEOUT" in prompt:
            raise RuntimeError("Network Timeout: Connection lost to Gemini API Endpoint.")
        if "TRIGGER_MALFORMED_JSON" in prompt:
            return "THIS IS INVALID NON-JSON TEXT { {{ malformed JSON... }}}"

        doc_match = re.search(r"Document Name:\s*([^\n]+)", prompt)
        doc_name = doc_match.group(1).strip() if doc_match else "unknown_document.pdf"

        page_match = re.search(r"Page Number:\s*(\d+)", prompt)
        page_num = int(page_match.group(1)) if page_match else 1

        # Check if the prompt is for Phase 3 Bidder Document Intelligence
        if "BIDDER DOCUMENT" in prompt or "FACT-" in prompt or "facts" in system_prompt.lower():
            idx_match = re.search(r"FACT-(\d+)", prompt)
            start_idx = int(idx_match.group(1)) if idx_match else 1
            facts: List[Dict[str, Any]] = []

            # Extract pure page text between --- markers to avoid matching prompt instructions or context headers
            page_text_match = re.search(r"---\s*\n(.*?)\n\s*---", prompt, re.DOTALL)
            pure_page_text = page_text_match.group(1) if page_text_match else prompt

            # Rule B1: Financial Turnover in bidder document
            if re.search(r"turnover", pure_page_text, re.IGNORECASE):
                cr_match = re.search(r"INR\s*(\d+)\s*Crore", pure_page_text, re.IGNORECASE)
                source_line = ""
                for line in pure_page_text.splitlines():
                    if "turnover" in line.lower():
                        source_line = line.strip()
                        break
                if cr_match and source_line:
                    val = int(cr_match.group(1)) * 10_000_000
                    facts.append({
                    "fact_id": f"FACT-{start_idx:03d}",
                    "category": "FINANCIAL",
                    "field": "annual_turnover",
                    "detected_value": val,
                    "unit": "INR",
                    "period": "last 3 fiscal years",
                    "confidence": 0.95,
                    "ambiguous": False,
                    "source_document": doc_name,
                    "page_number": page_num,
                    "source_text": source_line,
                    "section_name": "Financial Report Section"
                    })
                    start_idx += 1

            # Rule B2: ISO Certification in bidder document
            if re.search(r"ISO\s*9001", pure_page_text, re.IGNORECASE):
                source_line = ""
                for line in pure_page_text.splitlines():
                    if "iso" in line.lower():
                        source_line = line.strip()
                        break
                if source_line:
                    facts.append({
                    "fact_id": f"FACT-{start_idx:03d}",
                    "category": "CERTIFICATION",
                    "field": "iso_certification",
                    "detected_value": "ISO 9001:2015",
                    "unit": None,
                    "period": "Valid until 31 March 2027",
                    "confidence": 0.98,
                    "ambiguous": False,
                    "source_document": doc_name,
                    "page_number": page_num,
                    "source_text": source_line,
                    "section_name": "Quality Certification Section"
                    })
                    start_idx += 1

            # Rule B3: CERT-In Security Audit in bidder document
            if re.search(r"CERT-In|Cybersecurity", pure_page_text, re.IGNORECASE):
                source_line = ""
                for line in pure_page_text.splitlines():
                    if "cert-in" in line.lower() or "cybersecurity" in line.lower():
                        source_line = line.strip()
                        break
                if source_line:
                    facts.append({
                    "fact_id": f"FACT-{start_idx:03d}",
                    "category": "SECURITY",
                    "field": "cybersecurity_audit",
                    "detected_value": "CERT-In",
                    "unit": None,
                    "period": None,
                    "confidence": 0.95,
                    "ambiguous": False,
                    "source_document": doc_name,
                    "page_number": page_num,
                    "source_text": source_line,
                    "section_name": "Security Compliance Section"
                    })
                    start_idx += 1

            # Rule B4: GST Registration in bidder document
            if re.search(r"\bGST\b|GSTIN", pure_page_text, re.IGNORECASE):
                gst_match = re.search(r"\b(GSTIN[A-Z0-9]+|[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})\b", pure_page_text, re.IGNORECASE)
                source_line = ""
                for line in pure_page_text.splitlines():
                    if "gst" in line.lower():
                        source_line = line.strip()
                        break
                if gst_match and source_line:
                    gst_val = gst_match.group(1).upper()
                    facts.append({
                    "fact_id": f"FACT-{start_idx:03d}",
                    "category": "REGISTRATION",
                    "field": "gst_number",
                    "detected_value": gst_val,
                    "unit": None,
                    "period": None,
                    "confidence": 0.99,
                    "ambiguous": False,
                    "source_document": doc_name,
                    "page_number": page_num,
                    "source_text": source_line,
                    "section_name": "Company Registrations Section"
                    })
                    start_idx += 1

            # Rule B5: Net Worth in bidder document
            if re.search(r"net\s*worth", pure_page_text, re.IGNORECASE):
                source_line = ""
                for line in pure_page_text.splitlines():
                    if "net worth" in line.lower():
                        source_line = line.strip()
                        break
                nw_match = re.search(r"INR\s*(\d+(?:\.\d+)?)\s*Crore", source_line, re.IGNORECASE) if source_line else None
                if nw_match and source_line:
                    nw_val = float(nw_match.group(1)) * 10_000_000
                    facts.append({
                    "fact_id": f"FACT-{start_idx:03d}",
                    "category": "FINANCIAL",
                    "field": "net_worth",
                    "detected_value": nw_val,
                    "unit": "INR",
                    "period": "as on March 31 2025",
                    "confidence": 0.95,
                    "ambiguous": False,
                    "source_document": doc_name,
                    "page_number": page_num,
                    "source_text": source_line,
                    "section_name": "Financial Overview"
                    })
                    start_idx += 1

            # Rule B6: Domain Experience in bidder document
            if re.search(r"experience", pure_page_text, re.IGNORECASE):
                source_line = ""
                for line in pure_page_text.splitlines():
                    if "experience" in line.lower() and "turnover" not in line.lower():
                        source_line = line.strip()
                        break
                exp_match = re.search(r"(\d+)\s*years", source_line, re.IGNORECASE) if source_line else None
                if source_line:
                    exp_val = float(exp_match.group(1)) if exp_match else None
                    facts.append({
                    "fact_id": f"FACT-{start_idx:03d}",
                    "category": "EXPERIENCE",
                    "field": "domain_experience",
                    "detected_value": exp_val,
                    "unit": "years" if exp_val is not None else None,
                    "period": f"{exp_val} years" if exp_val is not None else None,
                    "confidence": 0.95 if exp_val is not None else 0.45,
                    "ambiguous": exp_val is None,
                    "source_document": doc_name,
                    "page_number": page_num,
                    "source_text": source_line,
                    "section_name": "Past Experience Overview"
                    })
                    start_idx += 1

            return json.dumps({"facts": facts})

        # Default Phase 2 Requirement Extraction rules
        idx_match = re.search(r"REQ-(\d+)", prompt)
        start_idx = int(idx_match.group(1)) if idx_match else 1
        requirements: List[Dict[str, Any]] = []

        # Rule 1: Financial Turnover
        if re.search(r"turnover", prompt, re.IGNORECASE):
            cr_match = re.search(r"INR\s*(\d+)\s*Crore", prompt, re.IGNORECASE)
            # Missing numeric evidence must remain missing. The mock provider is
            # for deterministic offline tests, not for inventing bidder facts.
            value = int(cr_match.group(1)) * 10_000_000 if cr_match else None
            
            source_line = ""
            for line in prompt.splitlines():
                if "turnover" in line.lower():
                    source_line = line.strip()
                    break

            requirements.append({
                "requirement_id": f"REQ-{start_idx:03d}",
                "category": "FINANCIAL",
                "description": "Minimum average annual turnover requirement",
                "required_value": value,
                "unit": "INR",
                "period": "last 3 fiscal years",
                "mandatory": True,
                "ambiguous": False,
                "source_document": doc_name,
                "page_number": page_num,
                "source_text": source_line,
                "status": "REVIEW",
            })
            start_idx += 1

        # Rule 2: ISO Certification
        if re.search(r"ISO\s*9001", prompt, re.IGNORECASE):
            source_line = ""
            for line in prompt.splitlines():
                if "iso" in line.lower():
                    source_line = line.strip()
                    break
            requirements.append({
                "requirement_id": f"REQ-{start_idx:03d}",
                "category": "CERTIFICATION",
                "description": "Valid ISO 9001:2015 Quality Management certification",
                "required_value": "ISO 9001:2015",
                "unit": None,
                "period": None,
                "mandatory": True,
                "ambiguous": False,
                "source_document": doc_name,
                "page_number": page_num,
                "source_text": source_line or "The bidder must hold a valid ISO 9001:2015 Quality Management certification.",
                "status": "REVIEW",
            })
            start_idx += 1

        # Rule 3: Cybersecurity / CERT-In Audit
        if re.search(r"CERT-In|Cybersecurity", prompt, re.IGNORECASE):
            source_line = ""
            for line in prompt.splitlines():
                if "cert-in" in line.lower() or "cybersecurity" in line.lower():
                    source_line = line.strip()
                    break
            requirements.append({
                "requirement_id": f"REQ-{start_idx:03d}",
                "category": "SECURITY",
                "description": "Valid Cybersecurity Audit Certificate issued by CERT-In",
                "required_value": "CERT-In",
                "unit": None,
                "period": None,
                "mandatory": True,
                "ambiguous": False,
                "source_document": doc_name,
                "page_number": page_num,
                "source_text": source_line or "The bidder must submit a valid Cybersecurity Audit Certificate issued by CERT-In.",
                "status": "REVIEW",
            })
            start_idx += 1

        # Rule 4: Submission Format (PDF)
        if re.search(r"PDF\s*format", prompt, re.IGNORECASE):
            source_line = ""
            for line in prompt.splitlines():
                if "pdf" in line.lower():
                    source_line = line.strip()
                    break
            requirements.append({
                "requirement_id": f"REQ-{start_idx:03d}",
                "category": "SUBMISSION",
                "description": "Proposals submission format in PDF",
                "required_value": "PDF",
                "unit": None,
                "period": None,
                "mandatory": True,
                "ambiguous": False,
                "source_document": doc_name,
                "page_number": page_num,
                "source_text": source_line or "All proposals must be uploaded in PDF format.",
                "status": "REVIEW",
            })
            start_idx += 1

        # Rule 5: EMD Requirement
        if re.search(r"EMD|Earnest Money Deposit", prompt, re.IGNORECASE):
            source_line = ""
            for line in prompt.splitlines():
                if "emd" in line.lower() or "earnest" in line.lower():
                    source_line = line.strip()
                    break
            requirements.append({
                "requirement_id": f"REQ-{start_idx:03d}",
                "category": "FINANCIAL",
                "description": "Earnest Money Deposit (EMD) requirement",
                "required_value": 100000,
                "unit": "INR",
                "period": None,
                "mandatory": True,
                "ambiguous": False,
                "source_document": doc_name,
                "page_number": page_num,
                "source_text": source_line or "EMD (Earnest Money Deposit): INR 1,00,000 to be deposited via online transfer.",
                "status": "REVIEW",
            })
            start_idx += 1

        # Rule 6: Bid / Proposal Validity Requirement
        if re.search(r"validity", prompt, re.IGNORECASE):
            source_line = ""
            for line in prompt.splitlines():
                if "validity" in line.lower():
                    source_line = line.strip()
                    break
            requirements.append({
                "requirement_id": f"REQ-{start_idx:03d}",
                "category": "SUBMISSION",
                "description": "Bid validity period requirement",
                "required_value": 180,
                "unit": "days",
                "period": "180 days from the date of tender opening",
                "mandatory": True,
                "ambiguous": False,
                "source_document": doc_name,
                "page_number": page_num,
                "source_text": source_line or "Bid Validity: 180 days from the date of tender opening.",
                "status": "REVIEW",
            })
            start_idx += 1

        # Rule 7: GST Registration
        if re.search(r"\bGST\b", prompt, re.IGNORECASE):
            source_line = ""
            for line in prompt.splitlines():
                if "gst" in line.lower():
                    source_line = line.strip()
                    break
            requirements.append({
                "requirement_id": f"REQ-{start_idx:03d}",
                "category": "REGISTRATION",
                "description": "Valid GST registration submission",
                "required_value": "GST",
                "unit": None,
                "period": None,
                "mandatory": True,
                "ambiguous": False,
                "source_document": doc_name,
                "page_number": page_num,
                "source_text": source_line or "Bidder shall submit valid GST registration.",
                "status": "REVIEW",
            })
            start_idx += 1

        # Rule 8: Ambiguous Experience Requirement
        if re.search(r"adequate\s+experience", prompt, re.IGNORECASE):
            source_line = ""
            for line in prompt.splitlines():
                if "adequate experience" in line.lower():
                    source_line = line.strip()
                    break
            requirements.append({
                "requirement_id": f"REQ-{start_idx:03d}",
                "category": "EXPERIENCE",
                "description": "Adequate relevant experience",
                "required_value": None,
                "unit": None,
                "period": None,
                "mandatory": True,
                "ambiguous": True,
                "source_document": doc_name,
                "page_number": page_num,
                "source_text": source_line or "Bidder must have adequate experience.",
                "status": "REVIEW",
            })
            start_idx += 1

        return json.dumps({"requirements": requirements})


def get_llm_client(force_mock: bool = False) -> BaseLLMProvider:
    """
    Factory function that inspects environment variables and instantiates the appropriate LLM provider.

    ENVIRONMENT VARIABLES READ:
        - LLM_PROVIDER: "gemini", "openai", "ollama", or "mock"
        - LLM_API_KEY: Secret API Key string for OpenAI or Gemini provider
        - LLM_MODEL: Target model (e.g. "gemini-1.5-flash", "gpt-4o-mini")
        - OLLAMA_MODEL: Local Ollama model name (e.g. "qwen2.5:3b", "llama3:latest")
        - OLLAMA_BASE_URL: Ollama server URL (default: http://localhost:11434)
        - OPENAI_BASE_URL: Custom endpoint URL if using an OpenAI-compatible local server

    CRITICAL SECURITY & VALIDATION BEHAVIOR:
        1. Reads .env file automatically via load_env_file().
        2. If LLM_PROVIDER="gemini": REQUIRES LLM_API_KEY to be set. Raises ValueError if missing.
           NEVER silently degrades or falls back to MockLLMProvider when Gemini is requested.
        3. If LLM_PROVIDER="openai": REQUIRES LLM_API_KEY to be set. Raises ValueError if missing.
        4. If LLM_PROVIDER="ollama": Uses local Ollama server. Validates model availability.
           NEVER silently degrades to MockLLMProvider when Ollama is requested.
        5. If LLM_PROVIDER="mock" or force_mock=True: Instantiates MockLLMProvider.
        6. If LLM_PROVIDER is unset: Checks LLM_API_KEY; if present, initializes real provider.
           If neither is set, defaults to MockLLMProvider for offline test compatibility.
    """
    if force_mock:
        return MockLLMProvider(notice_message="Explicit force_mock requested.")

    # Load local .env file into os.environ if present
    load_env_file()

    provider_name = os.environ.get("LLM_PROVIDER", "").lower().strip()
    api_key = os.environ.get("LLM_API_KEY", "").strip()
    model = os.environ.get("LLM_MODEL", "").strip()

    # -------------------------------------------------------------------------
    # CASE 1: Explicit Gemini Provider Requested
    # -------------------------------------------------------------------------
    if provider_name == "gemini":
        if not api_key:
            raise ValueError(
                "CONFIGURATION ERROR: LLM_PROVIDER is set to 'gemini', but LLM_API_KEY environment variable is empty or missing.\n"
                "Please set your Gemini API key: export LLM_API_KEY=\"<your_key>\""
            )
        model_name = model or "gemini-3.5-flash"
        print(f"[INFO] Initializing Real Gemini Provider (Model: '{model_name}')")
        return GeminiLLMProvider(api_key=api_key, model=model_name)

    # -------------------------------------------------------------------------
    # CASE 2: Explicit OpenAI Provider Requested
    # -------------------------------------------------------------------------
    if provider_name == "openai":
        if not api_key:
            raise ValueError(
                "CONFIGURATION ERROR: LLM_PROVIDER is set to 'openai', but LLM_API_KEY environment variable is empty or missing.\n"
                "Please set your OpenAI API key: export LLM_API_KEY=\"<your_key>\""
            )
        model_name = model or "gpt-4o-mini"
        api_base = os.environ.get("OPENAI_BASE_URL")
        print(f"[INFO] Initializing Real OpenAI Provider (Model: '{model_name}')")
        return OpenAILLMProvider(api_key=api_key, model=model_name, api_base=api_base)

    # -------------------------------------------------------------------------
    # CASE 3: Explicit Ollama Provider Requested (Local LLM)
    # -------------------------------------------------------------------------
    if provider_name == "ollama":
        ollama_model = model or os.environ.get("OLLAMA_MODEL", "qwen2.5:3b")
        ollama_base_url = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
        print(f"[INFO] Initializing Local Ollama Provider (Model: '{ollama_model}', Base URL: '{ollama_base_url}')")
        provider = OllamaLLMProvider(model=ollama_model, base_url=ollama_base_url)
        if not provider.health_check():
            raise RuntimeError(
                f"Ollama health check failed. Ensure Ollama is running at {ollama_base_url} "
                f"and model '{ollama_model}' is available (run 'ollama pull {ollama_model}')."
            )
        return provider

    # -------------------------------------------------------------------------
    # CASE 4: Explicit Mock Provider Requested
    # -------------------------------------------------------------------------
    if provider_name == "mock":
        return MockLLMProvider(notice_message="Explicit LLM_PROVIDER=mock requested.")

    # -------------------------------------------------------------------------
    # CASE 5: Implicit Provider Resolution (LLM_PROVIDER not explicitly set)
    # -------------------------------------------------------------------------
    if api_key:
        # Infer provider from API Key format if possible
        if api_key.startswith("AIza") or len(api_key) > 30:
            model_name = model or "gemini-3.5-flash"
            print(f"[INFO] Auto-detected Gemini Key. Initializing Gemini Provider (Model: '{model_name}')")
            return GeminiLLMProvider(api_key=api_key, model=model_name)
        elif api_key.startswith("sk-"):
            model_name = model or "gpt-4o-mini"
            print(f"[INFO] Auto-detected OpenAI Key. Initializing OpenAI Provider (Model: '{model_name}')")
            return OpenAILLMProvider(api_key=api_key, model=model_name)

    # Default fallback for unconfigured offline environments
    return MockLLMProvider(
        notice_message="No active LLM_PROVIDER or LLM_API_KEY detected in environment. Using rule-assisted MockLLMProvider."
    )
