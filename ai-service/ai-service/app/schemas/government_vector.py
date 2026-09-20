"""
===============================================================================
MODULE: app/schemas/government_vector.py
===============================================================================
PURPOSE:
    Defines data models for Phase 6B (Government Knowledge Embeddings + Vector Storage).

WHAT IT DOES:
    Defines the GovernmentKnowledgeVector dataclass representing a vectorized knowledge chunk,
    preserving full source metadata (document ID, page number, section name, text quote, chunk ID,
    content hash, embedding vector, and model metadata).

WHY WE NEED IT:
    Embeddings map unstructured text into dense vector spaces for fast semantic search.
    However, vectors alone cannot provide explainability. Preserving complete chunk metadata
    alongside the vector allows future RAG retrieval (Phase 6C+) to show the exact source text,
    page number, and section name to government evaluation officers ("SHOW WHY" principle).

HOW IT FITS INTO SEMANTIC SEARCH / RAG:
    GovernmentKnowledgeChunk (Phase 6A) -> Embedding Model -> GovernmentKnowledgeVector (Phase 6B)
    -> PostgreSQL + pgvector Storage -> Vector Similarity Search (Phase 6C) -> RAG Context (Phase 6D)
===============================================================================
"""

# standard library imports
from dataclasses import dataclass, asdict
from typing import Any, Dict, List, Optional


@dataclass
class GovernmentKnowledgeVector:
    """
    Data model representing a vectorized government knowledge chunk stored in PostgreSQL + pgvector.

    FIELDS EXPLAINED:
        chunk_id: Primary logical identifier of the chunk (e.g. "GOV-001-CH-001").
        document_id: Deterministic identifier of the parent document (e.g. "GOV-001").
        document_name: Filename of the source government PDF (e.g. "procurement_guidelines.pdf").
        source_type: Source classification, set to "GOVERNMENT".
        page_number: 1-based page number where the text chunk originated.
        section_name: Heading title of the section if detected, or None.
        text: Cleaned text content of the chunk.
        content_hash: SHA-256 fingerprint of the chunk text for idempotent duplicate prevention.
        embedding: List of float values representing the dense vector embedding.
        embedding_model: Identifier of the embedding model used (e.g. "text-embedding-004").
        embedding_dimension: Number of dimensions in the vector (e.g. 768).
        created_at: ISO-8601 timestamp string of creation, or None.
    """
    chunk_id: str
    document_id: str
    document_name: str
    page_number: int
    text: str
    content_hash: str
    embedding: List[float]
    embedding_model: str
    embedding_dimension: int
    source_type: str = "GOVERNMENT"
    section_name: Optional[str] = None
    created_at: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Converts knowledge vector instance to dictionary."""
        return asdict(self)
