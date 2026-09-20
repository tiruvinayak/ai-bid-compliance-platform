"""
===============================================================================
MODULE: app/requirement_extractor.py
===============================================================================
PURPOSE:
    Core service implementation for Phase 2 (AI Requirement Extraction).

WHAT IT DOES:
    - Takes structured Phase 1 output JSON (containing document name, page count, and page texts).
    - Processes text page-by-page to preserve exact 1-based page number traceability.
    - Sends structured extraction prompts to the configured LLM provider.
    - Robustly parses, validates, and normalizes extracted requirements using RequirementItem schema.
    - Generates sequential IDs (REQ-001, REQ-002, etc.) and enforces status="REVIEW".
    - Safely handles edge cases: empty documents, missing page text, invalid LLM JSON, and network errors.

WHY WE NEED IT:
    Acts as the main orchestrator for Phase 2 requirement extraction. Downstream phases
    (such as compliance evaluation in Phase 4) rely on the clean, structured requirement
    JSON list produced by this service.

HOW IT FITS INTO THE PIPELINE:
    Phase 1 Output JSON -> RequirementExtractor.extract_requirements() -> Phase 2 Requirements JSON
===============================================================================
"""

# standard library imports
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

# app module imports
from app.schemas.requirement import (
    ExtractionResult,
    RequirementItem,
    validate_and_normalize_requirement,
)
from app.prompts.requirement_extraction_prompt import (
    REQUIREMENT_EXTRACTION_SYSTEM_PROMPT,
    build_requirement_extraction_prompt,
)
from app.llm_client import BaseLLMProvider, get_llm_client

# Set up logging for Phase 2 requirement extractor module
logger = logging.getLogger("RequirementExtractor")


class RequirementExtractor:
    """
    Service orchestrator for Phase 2 requirement extraction from tender documents.
    """

    def __init__(self, llm_provider: Optional[BaseLLMProvider] = None):
        """
        Initializes RequirementExtractor with an optional LLM provider.

        WHAT: Sets the LLM client instance (e.g. OpenAI, Gemini, or Mock fallback).
        WHY: Allows injecting custom or mock LLM providers for unit testing.
        HOW: Uses passed provider or fetches default provider via get_llm_client().
        """
        self.llm_provider = llm_provider or get_llm_client()

    def extract_from_phase1_json(self, phase1_input: Union[Dict[str, Any], str, Path]) -> Dict[str, Any]:
        """
        Main entry point for extracting requirements from Phase 1 output JSON.

        Args:
            phase1_input (Dict | str | Path): Phase 1 result dictionary or path to Phase 1 JSON file.

        Returns:
            Dict[str, Any]: Phase 2 extraction result dictionary containing status and extracted requirements.
        """
        # -------------------------------------------------------------------------
        # STEP 1: Parse and Validate Phase 1 Input
        # -------------------------------------------------------------------------
        phase1_data: Dict[str, Any] = {}

        if isinstance(phase1_input, (str, Path)):
            file_path = Path(phase1_input)
            if not file_path.exists():
                return ExtractionResult(
                    success=False,
                    document_name=file_path.name,
                    total_requirements=0,
                    error_message=f"Phase 1 input JSON file not found at: {file_path}",
                ).to_dict()

            try:
                content = file_path.read_text(encoding="utf-8")
                phase1_data = json.loads(content)
            except Exception as e:
                return ExtractionResult(
                    success=False,
                    document_name=file_path.name,
                    total_requirements=0,
                    error_message=f"Failed to read/parse Phase 1 JSON file: {str(e)}",
                ).to_dict()
        elif isinstance(phase1_input, dict):
            phase1_data = phase1_input
        else:
            return ExtractionResult(
                success=False,
                document_name="unknown.pdf",
                total_requirements=0,
                error_message="Invalid phase1_input argument type. Expected dict, str, or Path.",
            ).to_dict()

        # Check Phase 1 success flag
        if not phase1_data.get("success", False):
            doc_name = phase1_data.get("document_name", "unknown.pdf")
            err_msg = phase1_data.get("message") or phase1_data.get("error_message") or "Phase 1 processing failed."
            return ExtractionResult(
                success=False,
                document_name=doc_name,
                total_requirements=0,
                error_message=f"Cannot extract requirements because Phase 1 failed: {err_msg}",
            ).to_dict()

        # -------------------------------------------------------------------------
        # STEP 2: Extract Page Metadata and Text
        # -------------------------------------------------------------------------
        doc_name = phase1_data.get("document_name", "unknown_document.pdf")
        pages = phase1_data.get("pages", [])

        if not pages:
            # Handle empty document text or empty page list
            return ExtractionResult(
                success=True,
                document_name=doc_name,
                total_requirements=0,
                requirements=[],
            ).to_dict()

        extracted_requirements: List[RequirementItem] = []
        global_req_counter = 1
        page_errors: List[str] = []

        # -------------------------------------------------------------------------
        # STEP 3: Iterate Page-by-Page for Precise Traceability
        # -------------------------------------------------------------------------
        for page in pages:
            page_num = page.get("page_number", 1)
            page_text = page.get("text", "").strip()
            has_text = page.get("has_text", True)

            # Skip scanned page notice or empty text pages safely
            if not has_text or not page_text or "OCR will be added" in page_text:
                logger.info(f"Skipping Page {page_num}: No extractable text or scanned document notice.")
                continue

            # Build prompt for current page
            prompt = build_requirement_extraction_prompt(
                page_text=page_text,
                document_name=doc_name,
                page_number=page_num,
                start_req_index=global_req_counter,
            )

            # ---------------------------------------------------------------------
            # STEP 4: Call LLM Provider Safely with Detailed Error Capture
            # ---------------------------------------------------------------------
            try:
                raw_llm_response = self.llm_provider.generate_json(
                    prompt=prompt,
                    system_prompt=REQUIREMENT_EXTRACTION_SYSTEM_PROMPT,
                )
            except Exception as e:
                err_msg = str(e)
                logger.error(f"LLM call failed for page {page_num}: {err_msg}")
                page_errors.append(f"Page {page_num}: {err_msg}")
                continue

            # ---------------------------------------------------------------------
            # STEP 5: Parse and Validate Structured JSON Response
            # ---------------------------------------------------------------------
            page_reqs = self._parse_llm_json(
                raw_json=raw_llm_response,
                default_doc_name=doc_name,
                default_page_num=page_num,
                start_counter=global_req_counter,
            )

            for req in page_reqs:
                extracted_requirements.append(req)
                global_req_counter += 1

        # -------------------------------------------------------------------------
        # STEP 6: Package Final Extraction Result
        # -------------------------------------------------------------------------
        # If all pages failed due to API/network errors, flag success=False with clear error details
        if not extracted_requirements and page_errors:
            combined_errors = " | ".join(page_errors)
            return ExtractionResult(
                success=False,
                document_name=doc_name,
                total_requirements=0,
                requirements=[],
                error_message=f"LLM Extraction failed on all pages: {combined_errors}",
            ).to_dict()

        result = ExtractionResult(
            success=True,
            document_name=doc_name,
            total_requirements=len(extracted_requirements),
            requirements=extracted_requirements,
            error_message=" | ".join(page_errors) if page_errors else None,
        )

        return result.to_dict()

    def extract_from_raw_text(self, text: str, document_name: str = "unknown_document.pdf", page_number: int = 1) -> Dict[str, Any]:
        """
        Utility method to extract requirements directly from a single text string (used in unit tests).

        WHAT: Simulates Phase 2 extraction for arbitrary text snippets.
        WHY: Enables standalone unit testing of requirements like Turnover, ISO, GST, etc.
        HOW: Wraps raw text in a mock Phase 1 dictionary structure and calls extract_from_phase1_json().
        """
        mock_phase1_data = {
            "success": True,
            "document_name": document_name,
            "page_count": 1,
            "is_scanned_or_empty": False,
            "pages": [
                {
                    "page_number": page_number,
                    "text": text,
                    "has_text": bool(text and text.strip()),
                }
            ],
        }
        return self.extract_from_phase1_json(mock_phase1_data)

    def _parse_llm_json(
        self,
        raw_json: str,
        default_doc_name: str,
        default_page_num: int,
        start_counter: int
    ) -> List[RequirementItem]:
        """
        Helper method to parse and sanitize raw JSON string returned by LLM.

        WHAT: Parses JSON string, handles invalid syntax, extracts requirement list, and sanitizes each item.
        WHY: Protects pipeline from malformed JSON output, markdown code fence blocks, or missing keys.
        HOW: Strips markdown backticks (```json ... ```), json.loads(), and calls validate_and_normalize_requirement().
        """
        if not raw_json or not raw_json.strip():
            return []

        cleaned_json = raw_json.strip()

        # Remove markdown triple-backticks if model included them
        if cleaned_json.startswith("```"):
            lines = cleaned_json.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            cleaned_json = "\n".join(lines).strip()

        try:
            parsed = json.loads(cleaned_json)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to decode LLM JSON output: {e}. Raw text: '{raw_json[:100]}...'")
            return []

        # Extract requirements list from dictionary or top-level list
        raw_list: List[Dict[str, Any]] = []
        if isinstance(parsed, dict):
            raw_list = parsed.get("requirements") or parsed.get("data") or []
        elif isinstance(parsed, list):
            raw_list = parsed

        validated_items: List[RequirementItem] = []
        counter = start_counter

        for raw_item in raw_list:
            if not isinstance(raw_item, dict):
                continue

            fallback_id = f"REQ-{counter:03d}"
            item = validate_and_normalize_requirement(
                raw_data=raw_item,
                default_doc_name=default_doc_name,
                default_page_num=default_page_num,
                fallback_id=fallback_id,
            )
            # Re-assign sequential ID to ensure no gaps or duplicate IDs across pages
            item.requirement_id = fallback_id
            validated_items.append(item)
            counter += 1

        return validated_items
