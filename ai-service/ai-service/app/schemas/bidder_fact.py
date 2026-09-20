"""
===============================================================================
MODULE: app/schemas/bidder_fact.py
===============================================================================
PURPOSE:
    Defines the standard schema and validation functions for bidder facts and
    evidence extracted during Phase 3 (Bidder Document Intelligence).

WHAT IT DOES:
    - Defines FactCategory Enum for controlled fact classifications (FINANCIAL, CERTIFICATION, etc.).
    - Defines BidderFactItem data model representing a single extracted fact/evidence snippet.
    - Defines BidderDocumentAnalysisResult container model holding document-level facts.
    - Provides validate_and_normalize_fact() to validate raw LLM outputs, normalize numeric values,
      and preserve page numbers, source document names, and source text quotes.

WHY WE NEED IT:
    Phase 3 extracts facts and evidence from bidder documents (e.g., turnover = 70000000 INR).
    This schema guarantees strict evidence preservation and standard data structures without
    making premature compliance (PASS/FAIL) decisions.

HOW IT FITS INTO THE PIPELINE:
    Bidder PDF -> Phase 1 Text -> Phase 3 Analyzer -> app.schemas.bidder_fact -> Phase 3 Facts JSON
===============================================================================
"""

# standard library imports
from enum import Enum
from typing import Any, Dict, List, Optional, Union
from dataclasses import dataclass, field, asdict


class FactCategory(str, Enum):
    """
    Controlled category enumeration for extracted bidder facts.

    WHAT: Allowed classifications for facts detected in bidder documents.
    WHY: Standardizes fact types so downstream compliance comparison (Phase 4+)
         can pair tender requirements with corresponding bidder evidence.
    HOW: Any category outside this list safely defaults to 'OTHER'.
    """
    FINANCIAL = "FINANCIAL"
    EXPERIENCE = "EXPERIENCE"
    CERTIFICATION = "CERTIFICATION"
    REGISTRATION = "REGISTRATION"
    TECHNICAL = "TECHNICAL"
    SECURITY = "SECURITY"
    IDENTITY = "IDENTITY"
    SUBMISSION = "SUBMISSION"
    OTHER = "OTHER"


@dataclass
class BidderFactItem:
    """
    Data model representing a single extracted fact / evidence item from a bidder document.

    FIELDS EXPLAINED:
        fact_id: Unique identifier for the extracted fact (e.g., "FACT-001").
        category: Fact category string (e.g., "FINANCIAL", "CERTIFICATION").
        field: Specific field name (e.g., "annual_turnover", "iso_9001_certification", "gst_number").
        detected_value: Quantitative numeric value (70000000) or text value ("ISO 9001:2015"), or None if vague.
        unit: Unit of measurement (e.g., "INR", "days", "years") or None.
        period: Time frame associated with the fact (e.g., "last 3 fiscal years", "valid until 31 March 2027").
        confidence: Confidence score between 0.0 and 1.0 provided by AI model, or None if undetermined.
        ambiguous: True if the statement is vague or non-quantified (e.g., "significant experience").
        source_document: Name of the bidder PDF document (e.g., "financial_report.pdf").
        page_number: 1-based page number where the fact was located in the PDF.
        source_text: Exact or direct quote snippet from the bidder document text.
        section_name: Optional header or section title where the fact was found.
    """
    fact_id: str
    category: str
    field: str
    detected_value: Optional[Union[int, float, str]] = None
    unit: Optional[str] = None
    period: Optional[str] = None
    confidence: Optional[float] = 0.95
    ambiguous: bool = False
    source_document: str = ""
    page_number: Optional[int] = 1
    source_text: str = ""
    section_name: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """
        Converts the BidderFactItem dataclass into a clean Python dictionary.
        """
        return asdict(self)


@dataclass
class BidderDocumentAnalysisResult:
    """
    Container model holding all extracted facts and evidence for a bidder document.
    """
    success: bool
    document_name: str
    total_facts: int
    facts: List[BidderFactItem] = field(default_factory=list)
    is_scanned_or_empty: bool = False
    status_code: str = "SUCCESS"  # SUCCESS, OCR_REQUIRED, EMPTY_DOCUMENT, ERROR
    error_message: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """
        Serializes the analysis result into a dictionary suitable for JSON export.
        """
        return {
            "success": self.success,
            "document_name": self.document_name,
            "total_facts": self.total_facts,
            "facts": [f.to_dict() for f in self.facts],
            "is_scanned_or_empty": self.is_scanned_or_empty,
            "status_code": self.status_code,
            "error_message": self.error_message,
        }


def validate_and_normalize_fact(
    raw_data: Dict[str, Any],
    default_doc_name: str = "unknown_bidder_doc.pdf",
    default_page_num: Optional[int] = 1,
    fallback_id: str = "FACT-000"
) -> BidderFactItem:
    """
    Validates, sanitizes, and normalizes a raw dictionary returned by the LLM into a safe BidderFactItem.

    WHAT:
        - Ensures missing keys get safe defaults.
        - Validates category against FactCategory Enum, mapping unknown categories to "OTHER".
        - Converts numeric string values to int/float where possible.
        - Preserves exact source document name, page number, and original quote snippet.
        - Handles confidence scores and ambiguity flags.

    WHY:
        Raw LLM outputs can vary or omit fields. Sanitizing ensures consistent data structures
        for Phase 4 compliance evaluation.

    HOW:
        Safely inspects each dictionary field, converts types, validates category, and constructs BidderFactItem.
    """
    # -------------------------------------------------------------------------
    # 1. Fact ID Validation
    # -------------------------------------------------------------------------
    fact_id = str(raw_data.get("fact_id") or fallback_id).strip()

    # -------------------------------------------------------------------------
    # 2. Category Normalization
    # -------------------------------------------------------------------------
    raw_category = str(raw_data.get("category", "OTHER")).upper().strip()
    valid_categories = {cat.value for cat in FactCategory}
    category = raw_category if raw_category in valid_categories else FactCategory.OTHER.value

    # -------------------------------------------------------------------------
    # 3. Field & Source Text Extraction
    # -------------------------------------------------------------------------
    field_name = str(raw_data.get("field") or "unspecified_fact").strip().lower().replace(" ", "_")
    source_text = str(raw_data.get("source_text") or "").strip()
    section_name = raw_data.get("section_name")
    section_name = str(section_name).strip() if section_name and str(section_name).strip() else None

    # -------------------------------------------------------------------------
    # 4. Detected Value & Unit Normalization
    # -------------------------------------------------------------------------
    raw_val = raw_data.get("detected_value")
    normalized_val: Optional[Union[int, float, str]] = None

    if raw_val is not None and str(raw_val).strip() != "":
        if isinstance(raw_val, (int, float)):
            normalized_val = raw_val
        elif isinstance(raw_val, str):
            cleaned_str = raw_val.strip().replace(",", "")
            try:
                if "." in cleaned_str:
                    normalized_val = float(cleaned_str)
                else:
                    normalized_val = int(cleaned_str)
            except ValueError:
                normalized_val = raw_val.strip()

    unit = raw_data.get("unit")
    unit = str(unit).strip() if unit is not None and str(unit).strip() != "" else None

    period = raw_data.get("period")
    period = str(period).strip() if period is not None and str(period).strip() != "" else None

    # -------------------------------------------------------------------------
    # 5. Confidence Score Normalization
    # -------------------------------------------------------------------------
    raw_conf = raw_data.get("confidence")
    confidence: Optional[float] = None
    if raw_conf is not None:
        try:
            conf_val = float(raw_conf)
            # Bound confidence between 0.0 and 1.0
            confidence = max(0.0, min(1.0, conf_val))
        except (ValueError, TypeError):
            confidence = None

    # -------------------------------------------------------------------------
    # 6. Ambiguity Flag Validation
    # -------------------------------------------------------------------------
    ambiguous = bool(raw_data.get("ambiguous", False))
    if normalized_val is None and category in ["EXPERIENCE", "FINANCIAL", "TECHNICAL"]:
        if raw_data.get("ambiguous") is None:
            ambiguous = True

    # -------------------------------------------------------------------------
    # 7. Source Traceability
    # -------------------------------------------------------------------------
    source_doc = str(raw_data.get("source_document") or default_doc_name).strip()
    raw_page = raw_data.get("page_number", default_page_num)
    page_number: Optional[int] = None
    if raw_page is not None:
        try:
            page_number = int(raw_page)
        except (ValueError, TypeError):
            page_number = default_page_num

    return BidderFactItem(
        fact_id=fact_id,
        category=category,
        field=field_name,
        detected_value=normalized_val,
        unit=unit,
        period=period,
        confidence=confidence,
        ambiguous=ambiguous,
        source_document=source_doc,
        page_number=page_number,
        source_text=source_text,
        section_name=section_name,
    )
