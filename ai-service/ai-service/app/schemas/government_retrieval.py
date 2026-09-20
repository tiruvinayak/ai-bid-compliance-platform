"""
===============================================================================
MODULE: app/schemas/government_retrieval.py
===============================================================================
PURPOSE:
    Defines data models for Phase 6C (Semantic Retrieval Engine).

WHAT IT DOES:
    - Defines GovernmentRetrievalResult dataclass representing a single retrieved knowledge chunk.
    - Defines GovernmentRetrievalResponse dataclass container for top-K search responses.

WHY WE NEED IT:
    Downstream RAG components (Phase 6D) and government evaluation officers need a clear,
    predictable structure representing retrieved knowledge sections, complete with 1-based ranks,
    cosine similarity scores, and full source traceability (document name, page number, section name, text).

HOW IT FITS INTO SEMANTIC RETRIEVAL / RAG:
    User Query -> GovernmentRetrievalService -> Vector Search -> GovernmentRetrievalResponse
    -> RAG Context Prompt (Phase 6D) / UI Search Results View
===============================================================================
"""

# standard library imports
from dataclasses import dataclass, field, asdict
from typing import Any, Dict, List, Optional


@dataclass
class GovernmentRetrievalResult:
    """
    Data model representing a single semantically relevant government knowledge chunk result.

    FIELDS EXPLAINED:
        chunk_id: Logical chunk identifier (e.g. "GOV-001-CH-002").
        document_id: Identifier of the parent document (e.g. "GOV-001").
        document_name: Filename of the source government PDF (e.g. "procurement_guidelines.pdf").
        source_type: Source classification, set to "GOVERNMENT".
        page_number: 1-based page number where the text originated.
        section_name: Heading title of the section if detected, or None.
        text: Cleaned text snippet of the chunk.
        similarity_score: Cosine similarity score between 0.0 and 1.0 (higher = closer).
        rank: 1-based rank position in search results (1 = top match).
    """
    chunk_id: str
    document_id: str
    document_name: str
    page_number: int
    text: str
    similarity_score: float
    rank: int
    source_type: str = "GOVERNMENT"
    section_name: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Converts retrieval result instance to dictionary."""
        return asdict(self)


@dataclass
class GovernmentRetrievalResponse:
    """
    Data model representing the overall response to a semantic retrieval query.

    FIELDS EXPLAINED:
        query: Original input search query text string.
        total_results: Count of retrieved knowledge chunk items meeting similarity threshold.
        status: Retrieval execution status string:
                "SUCCESS" -> Results found and returned.
                "NO_RELEVANT_RESULTS" -> Search executed but no chunks met similarity threshold.
                "KNOWLEDGE_BASE_EMPTY" -> No vectors present in the database.
                "VALIDATION_ERROR" -> Query string was null, empty, or whitespace.
                "EMBEDDING_ERROR" -> Query embedding provider failed.
                "EMBEDDING_DIMENSION_MISMATCH" -> Query vector dimension mismatched stored vectors.
                "DATABASE_ERROR" -> PostgreSQL database error occurred.
        error_message: Error details if status is not "SUCCESS" or "NO_RELEVANT_RESULTS", or None.
        results: List of GovernmentRetrievalResult objects sorted by similarity score descending.
    """
    query: str
    total_results: int
    status: str = "SUCCESS"
    error_message: Optional[str] = None
    results: List[GovernmentRetrievalResult] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        """Serializes response object and nested results into dictionary."""
        return {
            "query": self.query,
            "total_results": self.total_results,
            "status": self.status,
            "error_message": self.error_message,
            "results": [r.to_dict() for r in self.results],
        }
