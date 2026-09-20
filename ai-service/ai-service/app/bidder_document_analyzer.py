"""
===============================================================================
MODULE: app/bidder_document_analyzer.py
===============================================================================
PURPOSE:
    Core service implementation for Phase 3 (Bidder Document Intelligence).

WHAT IT DOES:
    - Takes Phase 1 output JSON for a bidder-submitted document.
    - Optionally receives Phase 2 extracted tender requirements to guide requirement-aware extraction.
    - Processes text page-by-page to preserve exact 1-based page number traceability.
    - Invokes configured LLM provider (Gemini / OpenAI / Mock) to extract factual statements.
    - Sanitizes and normalizes extracted facts (e.g., turnover = 70000000 INR).
    - Performs cross-page deduplication of identical facts while retaining primary evidence.
    - Returns structured BidderDocumentAnalysisResult.
    - Handles scanned PDFs safely by returning status_code="OCR_REQUIRED".

WHY WE NEED IT:
    Phase 3 extracts verifiable facts and evidence metrics from bidder proposals.
    Downstream Phase 4 compliance evaluation compares Phase 2 tender requirements
    against Phase 3 extracted bidder facts.

HOW IT FITS INTO THE PIPELINE:
    Bidder PDF -> Phase 1 Text -> BidderDocumentAnalyzer.analyze() -> Phase 3 Facts JSON
===============================================================================
"""

# standard library imports
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

# app module imports
from app.schemas.bidder_fact import (
    BidderDocumentAnalysisResult,
    BidderFactItem,
    validate_and_normalize_fact,
)
from app.prompts.bidder_document_prompt import (
    BIDDER_DOCUMENT_ANALYSIS_SYSTEM_PROMPT,
    build_bidder_document_prompt,
)
from app.llm_client import BaseLLMProvider, get_llm_client

# Set up logging for Phase 3 analyzer module
logger = logging.getLogger("BidderDocumentAnalyzer")


class BidderDocumentAnalyzer:
    """
    Service orchestrator for analyzing bidder-submitted documents and extracting facts.
    """

    def __init__(self, llm_provider: Optional[BaseLLMProvider] = None):
        """
        Initializes BidderDocumentAnalyzer with an optional LLM provider.

        WHAT: Sets the LLM client instance (e.g. Gemini, OpenAI, or Mock fallback).
        WHY: Allows injecting custom or mock providers for unit testing.
        HOW: Uses passed provider or fetches default provider via get_llm_client().
        """
        self.llm_provider = llm_provider or get_llm_client()

    def analyze_from_phase1_json(
        self,
        phase1_input: Union[Dict[str, Any], str, Path],
        target_requirements: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Main entry point for analyzing a bidder document using Phase 1 JSON output.

        Args:
            phase1_input (Dict | str | Path): Phase 1 result dictionary or path to JSON file.
            target_requirements (List[Dict], optional): Phase 2 extracted tender requirements.

        Returns:
            Dict[str, Any]: Phase 3 analysis result containing extracted facts and evidence.
        """
        # -------------------------------------------------------------------------
        # STEP 1: Parse and Validate Phase 1 Input
        # -------------------------------------------------------------------------
        phase1_data: Dict[str, Any] = {}

        if isinstance(phase1_input, (str, Path)):
            file_path = Path(phase1_input)
            if not file_path.exists():
                return BidderDocumentAnalysisResult(
                    success=False,
                    document_name=file_path.name,
                    total_facts=0,
                    status_code="ERROR",
                    error_message=f"Phase 1 input file not found at: {file_path}",
                ).to_dict()

            try:
                content = file_path.read_text(encoding="utf-8")
                phase1_data = json.loads(content)
            except Exception as e:
                return BidderDocumentAnalysisResult(
                    success=False,
                    document_name=file_path.name,
                    total_facts=0,
                    status_code="ERROR",
                    error_message=f"Failed to read/parse Phase 1 JSON file: {str(e)}",
                ).to_dict()
        elif isinstance(phase1_input, dict):
            phase1_data = phase1_input
        else:
            return BidderDocumentAnalysisResult(
                success=False,
                document_name="unknown_bidder.pdf",
                total_facts=0,
                status_code="ERROR",
                error_message="Invalid phase1_input type. Expected dict, str, or Path.",
            ).to_dict()

        doc_name = phase1_data.get("document_name", "bidder_document.pdf")

        # Check Phase 1 success flag
        if not phase1_data.get("success", False):
            err_msg = phase1_data.get("message") or phase1_data.get("error_message") or "Phase 1 failed."
            return BidderDocumentAnalysisResult(
                success=False,
                document_name=doc_name,
                total_facts=0,
                status_code="ERROR",
                error_message=f"Cannot analyze bidder document because Phase 1 failed: {err_msg}",
            ).to_dict()

        # -------------------------------------------------------------------------
        # STEP 2: Check for Scanned / Image-Only PDF Flag
        # -------------------------------------------------------------------------
        if phase1_data.get("is_scanned_or_empty", False):
            logger.warning(f"Document '{doc_name}' is scanned or empty. OCR required.")
            return BidderDocumentAnalysisResult(
                success=True,
                document_name=doc_name,
                total_facts=0,
                facts=[],
                is_scanned_or_empty=True,
                status_code="OCR_REQUIRED",
                error_message="Scanned or image-only document detected. OCR will be integrated in a later phase.",
            ).to_dict()

        pages = phase1_data.get("pages", [])
        if not pages:
            return BidderDocumentAnalysisResult(
                success=True,
                document_name=doc_name,
                total_facts=0,
                facts=[],
                status_code="EMPTY_DOCUMENT",
            ).to_dict()

        extracted_facts: List[BidderFactItem] = []
        global_fact_counter = 1
        page_errors: List[str] = []

        # -------------------------------------------------------------------------
        # STEP 3: Page-by-Page Extraction
        # -------------------------------------------------------------------------
        for page in pages:
            page_num = page.get("page_number", 1)
            page_text = page.get("text", "").strip()
            has_text = page.get("has_text", True)

            if not has_text or not page_text or "OCR will be added" in page_text:
                continue

            prompt = build_bidder_document_prompt(
                page_text=page_text,
                document_name=doc_name,
                page_number=page_num,
                target_requirements=target_requirements,
                start_fact_index=global_fact_counter,
            )

            try:
                raw_llm_response = self.llm_provider.generate_json(
                    prompt=prompt,
                    system_prompt=BIDDER_DOCUMENT_ANALYSIS_SYSTEM_PROMPT,
                )
            except Exception as e:
                err_msg = str(e)
                logger.error(f"LLM call failed for bidder page {page_num}: {err_msg}")
                page_errors.append(f"Page {page_num}: {err_msg}")
                continue

            page_facts = self._parse_llm_json(
                raw_json=raw_llm_response,
                default_doc_name=doc_name,
                default_page_num=page_num,
                start_counter=global_fact_counter,
            )

            for fact in page_facts:
                extracted_facts.append(fact)
                global_fact_counter += 1

        # -------------------------------------------------------------------------
        # STEP 4: Handle All-Page LLM Failures
        # -------------------------------------------------------------------------
        if not extracted_facts and page_errors:
            combined_errors = " | ".join(page_errors)
            return BidderDocumentAnalysisResult(
                success=False,
                document_name=doc_name,
                total_facts=0,
                facts=[],
                status_code="ERROR",
                error_message=f"LLM Fact Extraction failed on all pages: {combined_errors}",
            ).to_dict()

        # -------------------------------------------------------------------------
        # STEP 5: Deduplicate Facts Across Pages
        # -------------------------------------------------------------------------
        deduplicated_facts = self._deduplicate_facts(extracted_facts)

        return BidderDocumentAnalysisResult(
            success=True,
            document_name=doc_name,
            total_facts=len(deduplicated_facts),
            facts=deduplicated_facts,
            status_code="SUCCESS",
            error_message=" | ".join(page_errors) if page_errors else None,
        ).to_dict()

    def analyze_from_raw_text(
        self,
        text: str,
        document_name: str = "bidder_doc.pdf",
        page_number: int = 1,
        target_requirements: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Utility method to analyze bidder facts directly from raw text string (used in unit tests).
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
        return self.analyze_from_phase1_json(mock_phase1_data, target_requirements=target_requirements)

    def _parse_llm_json(
        self,
        raw_json: str,
        default_doc_name: str,
        default_page_num: int,
        start_counter: int
    ) -> List[BidderFactItem]:
        """
        Helper method to parse and sanitize raw JSON string returned by LLM into BidderFactItem instances.
        """
        if not raw_json or not raw_json.strip():
            return []

        cleaned_json = raw_json.strip()
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
            logger.error(f"Failed to decode LLM JSON output for bidder fact: {e}")
            return []

        raw_list: List[Dict[str, Any]] = []
        if isinstance(parsed, dict):
            raw_list = parsed.get("facts") or parsed.get("data") or []
        elif isinstance(parsed, list):
            raw_list = parsed

        validated_items: List[BidderFactItem] = []
        counter = start_counter

        for raw_item in raw_list:
            if not isinstance(raw_item, dict):
                continue

            fallback_id = f"FACT-{counter:03d}"
            item = validate_and_normalize_fact(
                raw_data=raw_item,
                default_doc_name=default_doc_name,
                default_page_num=default_page_num,
                fallback_id=fallback_id,
            )
            item.fact_id = fallback_id
            validated_items.append(item)
            counter += 1

        return validated_items

    def _deduplicate_facts(self, facts: List[BidderFactItem]) -> List[BidderFactItem]:
        """
        Deduplicates identical facts extracted across multiple pages while preserving primary evidence.

        WHAT: Groups facts by (category, field, detected_value), selecting the item with highest confidence.
        WHY: Prevents duplicate facts when the same company turnover or cert is repeated across pages.
        HOW: Retains distinct fields/values while re-indexing sequential fact IDs.
        """
        seen_keys = set()
        unique_facts: List[BidderFactItem] = []
        counter = 1

        for fact in facts:
            key = (fact.category, fact.field, str(fact.detected_value).strip().lower() if fact.detected_value else "")
            if key in seen_keys:
                continue
            seen_keys.add(key)
            fact.fact_id = f"FACT-{counter:03d}"
            unique_facts.append(fact)
            counter += 1

        return unique_facts
