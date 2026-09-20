"""
===============================================================================
MODULE: app/government_knowledge_ingestor.py
===============================================================================
PURPOSE:
    Core service implementation for Phase 6A (Government Knowledge Ingestion).

WHAT IT DOES:
    - Validates government PDF documents (file extension, path, corruption).
    - Reuses Phase 1 PDF text extraction to extract page-by-page text.
    - Calculates SHA-256 content hashes to detect and prevent duplicate document ingestions.
    - Performs deterministic section heading detection (e.g. "1. Introduction", "2. Eligibility").
    - Performs deterministic page-aware chunking (~800-1200 chars) with paragraph overlap (~100-150 chars).
    - Generates stable document IDs (e.g. "GOV-001") and stable chunk IDs (e.g. "GOV-001-CH-001").
    - Attaches complete source metadata (document name, page number, section, text quote, chunk ID).

WHY WE NEED IT:
    Prepares trusted government procurement guidelines, GFR rules, and policy documents
    into clean, searchable, traceable chunks for future RAG components (Phase 6B+).
    Ensures zero hallucination by strictly maintaining original source traceability.

HOW IT FITS INTO THE FUTURE RAG PIPELINE:
    Government PDF -> GovernmentKnowledgeIngestor -> Chunks JSON -> Vector Database / Embeddings (Phase 6B+)
===============================================================================
"""

# standard library imports
import hashlib
import os
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple, Union

# App imports
from app.document_processor import clean_extracted_text, extract_pdf_text
from app.schemas.government_knowledge import (
    GovernmentKnowledgeChunk,
    GovernmentKnowledgeDocument,
)


class GovernmentKnowledgeIngestor:
    """
    Service orchestrator for ingesting trusted government procurement PDFs into page-aware knowledge chunks.
    """

    def __init__(self):
        """
        Initializes GovernmentKnowledgeIngestor with an in-memory set tracking ingested content hashes.
        """
        self.ingested_hashes: Set[str] = set()

    def ingest_document(self, file_path: Union[str, Path]) -> Dict[str, Any]:
        """
        Main entry point for ingesting a government PDF document.

        Args:
            file_path: Path to the target government PDF document.

        Returns:
            Dict[str, Any]: Serialized GovernmentKnowledgeDocument dictionary.
        """
        path = Path(file_path)

        # -------------------------------------------------------------------------
        # STEP 1: Document Validation
        # -------------------------------------------------------------------------
        # WHAT: Validate file existence, non-empty size, and .pdf extension.
        # WHY: Returns clear error dicts without crashing the application.
        val_success, val_error = self._validate_document(path)
        if not val_success:
            return GovernmentKnowledgeDocument(
                document_id="GOV-INVALID",
                document_name=path.name if path else "unknown",
                page_count=0,
                total_chunks=0,
                status="ERROR",
                error_message=val_error,
                content_hash="",
                chunks=[]
            ).to_dict()

        # -------------------------------------------------------------------------
        # STEP 2: Reuse Phase 1 Text Extraction & Scanned Check
        # -------------------------------------------------------------------------
        # WHAT: Reuse Phase 1 extract_pdf_text() to get clean page-by-page text.
        # WHY: Prevents code duplication and leverages PyMuPDF extraction.
        phase1_result = extract_pdf_text(str(path))
        if not phase1_result.get("success"):
            return GovernmentKnowledgeDocument(
                document_id="GOV-ERROR",
                document_name=path.name,
                page_count=0,
                total_chunks=0,
                status="ERROR",
                error_message=phase1_result.get("message", "PDF extraction failed."),
                content_hash="",
                chunks=[]
            ).to_dict()

        # Check for scanned or empty documents
        if phase1_result.get("is_scanned_or_empty"):
            return GovernmentKnowledgeDocument(
                document_id=self._generate_document_id(path.name, ""),
                document_name=path.name,
                page_count=phase1_result.get("page_count", 0),
                total_chunks=0,
                status="OCR_REQUIRED",
                error_message="Document contains no extractable text. OCR processing required.",
                content_hash="",
                chunks=[]
            ).to_dict()

        # -------------------------------------------------------------------------
        # STEP 3: Content Hashing & Duplicate Detection
        # -------------------------------------------------------------------------
        # WHAT: Compute SHA-256 fingerprint of the extracted document text.
        # WHY: Identifies whether the exact same document has already been ingested.
        full_text = "".join([p.get("text", "") for p in phase1_result.get("pages", [])])
        content_hash = hashlib.sha256(full_text.encode("utf-8")).hexdigest()

        if content_hash in self.ingested_hashes:
            return GovernmentKnowledgeDocument(
                document_id=self._generate_document_id(path.name, content_hash),
                document_name=path.name,
                page_count=phase1_result.get("page_count", 0),
                total_chunks=0,
                status="DUPLICATE",
                error_message="Document has already been ingested into the knowledge base.",
                content_hash=content_hash,
                chunks=[]
            ).to_dict()

        # Register hash to track ingestion
        self.ingested_hashes.add(content_hash)
        document_id = self._generate_document_id(path.name, content_hash)

        # -------------------------------------------------------------------------
        # STEP 4: Page-Aware Chunking & Section Detection
        # -------------------------------------------------------------------------
        all_chunks: List[GovernmentKnowledgeChunk] = []
        chunk_counter = 1

        for page in phase1_result.get("pages", []):
            page_num = page.get("page_number", 1)
            raw_page_text = page.get("text", "")

            if not raw_page_text.strip():
                continue

            cleaned_page_text = clean_extracted_text(raw_page_text)
            section_name = self._detect_section_name(cleaned_page_text)

            page_chunks, chunk_counter = self._chunk_page_text(
                page_text=cleaned_page_text,
                document_id=document_id,
                document_name=path.name,
                page_number=page_num,
                section_name=section_name,
                chunk_counter=chunk_counter
            )
            all_chunks.extend(page_chunks)

        # -------------------------------------------------------------------------
        # STEP 5: Construct Final Knowledge Document Container
        # -------------------------------------------------------------------------
        doc_result = GovernmentKnowledgeDocument(
            document_id=document_id,
            document_name=path.name,
            page_count=phase1_result.get("page_count", 0),
            total_chunks=len(all_chunks),
            status="SUCCESS",
            error_message=None,
            content_hash=content_hash,
            chunks=all_chunks
        )
        return doc_result.to_dict()

    # -------------------------------------------------------------------------
    # INTERNAL HELPER METHODS
    # -------------------------------------------------------------------------

    def _validate_document(self, path: Path) -> Tuple[bool, Optional[str]]:
        """Validates path existence, extension, and non-empty file size."""
        if not path.exists():
            return False, f"File not found: '{path}'"
        if not path.is_file():
            return False, f"Path is not a regular file: '{path}'"
        if path.suffix.lower() != ".pdf":
            return False, f"Unsupported file extension '{path.suffix}'. Only .pdf is supported."
        if path.stat().st_size == 0:
            return False, f"File is empty (0 bytes): '{path}'"
        return True, None

    def _generate_document_id(self, doc_name: str, content_hash: str) -> str:
        """
        Generates a stable, deterministic document ID.
        Example: "procurement_guidelines.pdf" -> "GOV-PROCUREMENTGUIDELINES" or "GOV-001"
        """
        if content_hash:
            short_hash = content_hash[:6].upper()
            clean_name = re.sub(r"[^A-Z0-9]", "", doc_name.upper())[:10]
            return f"GOV-{clean_name}-{short_hash}"
        clean_name = re.sub(r"[^A-Z0-9]", "", doc_name.upper())[:12]
        return f"GOV-{clean_name}"

    def _detect_section_name(self, page_text: str) -> Optional[str]:
        """
        Detects section headings using deterministic heading patterns.

        WHAT: Scans text lines for numbered sections ("1. Introduction") or known headings.
        WHY: Provides section context for knowledge chunks without relying on LLM guessing.
        HOW: Evaluates regex matching against line starts.
        """
        known_sections = [
            "Introduction", "Eligibility Requirements", "Eligibility Criteria",
            "Bid Security", "Submission Requirements", "Financial Requirements",
            "General Conditions", "Scope of Work", "Evaluation Procedure"
        ]

        for line in page_text.splitlines():
            line_str = line.strip()
            if not line_str:
                continue

            # Pattern 1: Numbered heading e.g. "1. Introduction" or "2. Eligibility Requirements"
            match = re.search(r"^\s*(\d+[\.\)]\s+[A-Za-z][^\n]{3,60})", line_str)
            if match:
                return match.group(1).strip()

            # Pattern 2: Known section keywords
            for s in known_sections:
                if line_str.lower() == s.lower() or line_str.lower().startswith(s.lower()):
                    return line_str

        return None

    def _chunk_page_text(
        self,
        page_text: str,
        document_id: str,
        document_name: str,
        page_number: int,
        section_name: Optional[str],
        chunk_counter: int,
        target_chunk_size: int = 1000,
        overlap_size: int = 120
    ) -> Tuple[List[GovernmentKnowledgeChunk], int]:
        """
        Splits page text into deterministic chunks (~800-1200 chars) with paragraph overlap (~100-150 chars).

        WHAT: Groups paragraph blocks, applies overlap, and creates traceable GovernmentKnowledgeChunk objects.
        WHY: Optimal chunk size for vector embeddings and search retrieval without word splitting.
        HOW: Splits text on paragraph double-newlines, accumulates text up to target_chunk_size, and prepends overlap.
        """
        chunks: List[GovernmentKnowledgeChunk] = []

        # Split text into paragraph blocks
        paragraphs = [p.strip() for p in page_text.split("\n\n") if p.strip()]
        if not paragraphs:
            paragraphs = [page_text.strip()]

        current_text = ""
        last_overlap = ""

        for p in paragraphs:
            if not current_text:
                current_text = p
            elif len(current_text) + len(p) + 2 <= target_chunk_size:
                current_text += "\n\n" + p
            else:
                # Flush current_text as a chunk
                full_chunk_text = (last_overlap + "\n\n" + current_text).strip() if last_overlap else current_text
                cid = f"{document_id}-CH-{chunk_counter:03d}"
                chunk_counter += 1

                chunks.append(GovernmentKnowledgeChunk(
                    chunk_id=cid,
                    document_id=document_id,
                    document_name=document_name,
                    source_type="GOVERNMENT",
                    page_number=page_number,
                    section_name=section_name,
                    text=full_chunk_text,
                    character_count=len(full_chunk_text)
                ))

                # Calculate overlap for next chunk
                last_overlap = current_text[-overlap_size:] if len(current_text) > overlap_size else current_text
                current_text = p

        # Flush final paragraph group
        if current_text:
            full_chunk_text = (last_overlap + "\n\n" + current_text).strip() if last_overlap else current_text
            cid = f"{document_id}-CH-{chunk_counter:03d}"
            chunk_counter += 1

            chunks.append(GovernmentKnowledgeChunk(
                chunk_id=cid,
                document_id=document_id,
                document_name=document_name,
                source_type="GOVERNMENT",
                page_number=page_number,
                section_name=section_name,
                text=full_chunk_text,
                character_count=len(full_chunk_text)
            ))

        return chunks, chunk_counter
