"""
===============================================================================
MODULE: app/schemas/government_knowledge.py
===============================================================================
PURPOSE:
    Defines the standard data models for Phase 6A (Government Knowledge Ingestion).

WHAT IT DOES:
    - Defines GovernmentKnowledgeChunk dataclass for page-traceable, searchable text chunks.
    - Defines GovernmentKnowledgeDocument dataclass container for ingested government PDFs.

WHY WE NEED IT:
    Phase 6A converts trusted government procurement guidelines, GFR rules, and policy
    manuals into clean, structured, page-aware chunks. These schemas guarantee that every
    chunk retains full source metadata (document ID, page number, section name, text, and chunk ID)
    for downstream RAG retrieval in future phases.

HOW IT FITS INTO THE FUTURE RAG PIPELINE:
    Government PDF -> Ingestor -> GovernmentKnowledgeDocument & Chunks -> Vector DB / Embeddings (Phase 6B+)
===============================================================================
"""

# standard library imports
from dataclasses import dataclass, field, asdict
from typing import Any, Dict, List, Optional


@dataclass
class GovernmentKnowledgeChunk:
    """
    Data model representing a single page-aware, traceable text chunk from a government document.

    FIELDS EXPLAINED:
        chunk_id: Stable, deterministic identifier (e.g., "GOV-001-CH-001").
        document_id: Deterministic identifier of the parent document (e.g., "GOV-001").
        document_name: Filename of the source PDF (e.g., "procurement_guidelines.pdf").
        source_type: Source classification, strictly set to "GOVERNMENT".
        page_number: 1-based page number where the chunk content originated.
        section_name: Heading title of the section if detected (e.g., "1. Introduction"), or None.
        text: Cleaned text content of the chunk.
        character_count: Length of the chunk text in characters.
    """
    chunk_id: str
    document_id: str
    document_name: str
    page_number: int
    text: str
    character_count: int
    source_type: str = "GOVERNMENT"
    section_name: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Converts knowledge chunk to dictionary."""
        return asdict(self)


@dataclass
class GovernmentKnowledgeDocument:
    """
    Data model representing an ingested government PDF document and its metadata.

    FIELDS EXPLAINED:
        document_id: Deterministic identifier derived from document content/name (e.g., "GOV-001").
        document_name: Filename of the ingested PDF.
        source_type: Source classification ("GOVERNMENT").
        page_count: Total pages processed in the document.
        total_chunks: Number of chunks created from the document text.
        status: Ingestion status ("SUCCESS", "OCR_REQUIRED", "DUPLICATE", "ERROR").
        error_message: Error details if ingestion failed, or None.
        content_hash: SHA-256 fingerprint of the document content to prevent duplicates.
        publication_date: Official publication date if specified, or None.
        effective_date: Policy effective date if specified, or None.
        version: Document version/revision number if specified, or None.
        chunks: List of GovernmentKnowledgeChunk objects.
    """
    document_id: str
    document_name: str
    page_count: int
    total_chunks: int
    status: str = "SUCCESS"
    error_message: Optional[str] = None
    content_hash: str = ""
    source_type: str = "GOVERNMENT"
    publication_date: Optional[str] = None
    effective_date: Optional[str] = None
    version: Optional[str] = None
    chunks: List[GovernmentKnowledgeChunk] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        """
        Serializes the complete government knowledge document and chunks into a dictionary.
        """
        return {
            "document_id": self.document_id,
            "document_name": self.document_name,
            "source_type": self.source_type,
            "page_count": self.page_count,
            "total_chunks": self.total_chunks,
            "status": self.status,
            "error_message": self.error_message,
            "content_hash": self.content_hash,
            "publication_date": self.publication_date,
            "effective_date": self.effective_date,
            "version": self.version,
            "chunks": [c.to_dict() for c in self.chunks],
        }
