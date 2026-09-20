"""
===============================================================================
MODULE: app/schemas/requirement.py
===============================================================================
PURPOSE:
    Defines the standard schema and validation functions for tender requirements
    extracted during Phase 2 (AI Requirement Extraction).

WHAT IT DOES:
    - Enforces a controlled vocabulary for requirement categories (FINANCIAL, CERTIFICATION, etc.).
    - Defines the structured data model (RequirementItem) representing a single requirement.
    - Defines the container model (ExtractionResult) for document-level extraction results.
    - Provides a sanitizer function (validate_and_normalize_requirement) that validates,
      normalizes, and fallback-protects raw LLM output against malformed fields.

WHY WE NEED IT:
    LLM outputs can be non-deterministic or omit required keys. This schema acts as
    a strict validation contract between the LLM layer and downstream pipeline phases,
    ensuring every requirement has exact source page traceability and a consistent format.

HOW IT FITS INTO THE PIPELINE:
    Phase 1 JSON Text -> Phase 2 Extractor -> app.schemas.requirement -> Validated Phase 2 JSON
===============================================================================
"""

# standard library imports
from enum import Enum
from typing import Any, Dict, List, Optional, Union
from dataclasses import dataclass, field, asdict


class RequirementCategory(str, Enum):
    """
    Controlled category enumeration for tender requirements.
    
    WHAT: List of allowed requirement classifications.
    WHY: Prevents category proliferation (e.g. "MONEY" vs "FINANCE") so downstream
         compliance logic can filter requirements deterministically.
    HOW: Any category not present in this Enum will safely fall back to 'OTHER'.
    """
    FINANCIAL = "FINANCIAL"
    TECHNICAL = "TECHNICAL"
    EXPERIENCE = "EXPERIENCE"
    CERTIFICATION = "CERTIFICATION"
    REGISTRATION = "REGISTRATION"
    LEGAL = "LEGAL"
    SECURITY = "SECURITY"
    DOCUMENT = "DOCUMENT"
    ELIGIBILITY = "ELIGIBILITY"
    SUBMISSION = "SUBMISSION"
    OTHER = "OTHER"


@dataclass
class RequirementItem:
    """
    Data model for a single extracted procurement requirement.
    
    FIELDS EXPLAINED:
        requirement_id: Unique string identifier (e.g., "REQ-001").
        category: Controlled category string (e.g., "FINANCIAL", "CERTIFICATION").
        description: Brief summary of what the tender requires from the bidder.
        required_value: Quantitative numeric value (50000000) or text string ("ISO 9001:2015"), or None if vague.
        unit: Unit of measurement (e.g., "INR", "days", "years") or None if not applicable.
        period: Time frame associated with requirement (e.g., "last 3 fiscal years", "180 days") or None.
        mandatory: True if mandatory (must/shall), False if optional, None if ambiguous/unclear.
        ambiguous: True if the requirement lacks specific quantifiable criteria (e.g., "adequate experience").
        source_document: Filename of the source tender document (e.g., "sample_tender.pdf").
        page_number: 1-based page number where the requirement was found in the PDF.
        source_text: Exact or direct excerpt text from the original tender document.
        status: Initial pipeline status, defaults to "REVIEW" (bidder compliance is NOT evaluated in Phase 2).
    """
    requirement_id: str
    category: str
    description: str
    required_value: Optional[Union[int, float, str]] = None
    unit: Optional[str] = None
    period: Optional[str] = None
    mandatory: Optional[bool] = True
    ambiguous: bool = False
    source_document: str = ""
    page_number: int = 1
    source_text: str = ""
    status: str = "REVIEW"

    def to_dict(self) -> Dict[str, Any]:
        """
        Converts the RequirementItem dataclass instance into a clean Python dictionary.
        
        WHAT: Transforms structured dataclass to JSON-serializable dictionary.
        WHY: Python's standard json module requires standard dicts/primitives.
        HOW: Calls dataclasses.asdict() on self.
        """
        return asdict(self)


@dataclass
class ExtractionResult:
    """
    Container model holding the complete requirement extraction output for a document.
    """
    success: bool
    document_name: str
    total_requirements: int
    requirements: List[RequirementItem] = field(default_factory=list)
    error_message: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """
        Serializes the ExtractionResult and nested RequirementItems into a dictionary.
        """
        return {
            "success": self.success,
            "document_name": self.document_name,
            "total_requirements": self.total_requirements,
            "requirements": [req.to_dict() for req in self.requirements],
            "error_message": self.error_message,
        }


def validate_and_normalize_requirement(
    raw_data: Dict[str, Any],
    default_doc_name: str = "unknown.pdf",
    default_page_num: int = 1,
    fallback_id: str = "REQ-000"
) -> RequirementItem:
    """
    Validates, sanitizes, and normalizes a raw dictionary returned by the LLM into a safe RequirementItem.

    WHAT:
        - Ensures missing keys get safe defaults.
        - Validates categories against RequirementCategory Enum, mapping unknown categories to "OTHER".
        - Enforces numeric conversion for required_value where applicable.
        - Guarantees default status = "REVIEW".
        - Preserves exact source document name, page number, and source snippet.

    WHY:
        LLM output may occasionally omit fields, return unexpected types, or invent category names.
        Sanitizing ensures downstream processing never encounters key errors or bad data types.

    HOW:
        Extracts each field safely with .get(), converts types, validates category against Enum,
        and constructs a validated RequirementItem object.
    """
    # -------------------------------------------------------------------------
    # 1. Requirement ID Validation
    # -------------------------------------------------------------------------
    req_id = str(raw_data.get("requirement_id") or fallback_id).strip()

    # -------------------------------------------------------------------------
    # 2. Category Normalization
    # -------------------------------------------------------------------------
    # WHAT: Check if category provided by LLM matches controlled list.
    # HOW: Upper-case string check against RequirementCategory Enum members.
    raw_category = str(raw_data.get("category", "OTHER")).upper().strip()
    valid_categories = {cat.value for cat in RequirementCategory}
    if raw_category in valid_categories:
        category = raw_category
    else:
        # Fallback to OTHER if LLM generated an unknown category name
        category = RequirementCategory.OTHER.value

    # -------------------------------------------------------------------------
    # 3. Description & Source Text Extraction
    # -------------------------------------------------------------------------
    description = str(raw_data.get("description") or "Unspecified tender requirement").strip()
    source_text = str(raw_data.get("source_text") or "").strip()

    # -------------------------------------------------------------------------
    # 4. Required Value & Unit Normalization
    # -------------------------------------------------------------------------
    raw_val = raw_data.get("required_value")
    normalized_value: Optional[Union[int, float, str]] = None

    if raw_val is not None and str(raw_val).strip() != "":
        if isinstance(raw_val, (int, float)):
            normalized_value = raw_val
        elif isinstance(raw_val, str):
            # Attempt converting string numeric representation (e.g. "50000000" -> int 50000000)
            cleaned_str = raw_val.strip().replace(",", "")
            try:
                if "." in cleaned_str:
                    normalized_value = float(cleaned_str)
                else:
                    normalized_value = int(cleaned_str)
            except ValueError:
                # If not a pure numeric string (e.g., "ISO 9001:2015"), keep original text string
                normalized_value = raw_val.strip()

    unit = raw_data.get("unit")
    unit = str(unit).strip() if unit is not None and str(unit).strip() != "" else None

    period = raw_data.get("period")
    period = str(period).strip() if period is not None and str(period).strip() != "" else None

    # -------------------------------------------------------------------------
    # 5. Mandatory & Ambiguous Flags Validation
    # -------------------------------------------------------------------------
    raw_mandatory = raw_data.get("mandatory")
    if isinstance(raw_mandatory, bool):
        mandatory = raw_mandatory
    elif raw_mandatory is None:
        mandatory = None
    else:
        # Parse string boolean representations like "true"/"false"
        mandatory_str = str(raw_mandatory).lower().strip()
        if mandatory_str == "true":
            mandatory = True
        elif mandatory_str == "false":
            mandatory = False
        else:
            mandatory = None

    ambiguous = bool(raw_data.get("ambiguous", False))
    # If required_value is None and category is vague (e.g. experience), flag ambiguity
    if normalized_value is None and category in ["EXPERIENCE", "TECHNICAL", "FINANCIAL"]:
        if raw_data.get("ambiguous") is None:
            ambiguous = True

    # -------------------------------------------------------------------------
    # 6. Source Metadata Traceability
    # -------------------------------------------------------------------------
    source_doc = str(raw_data.get("source_document") or default_doc_name).strip()
    try:
        page_num = int(raw_data.get("page_number", default_page_num))
    except (ValueError, TypeError):
        page_num = default_page_num

    # -------------------------------------------------------------------------
    # 7. Status Enforcement (ALWAYS "REVIEW" in Phase 2)
    # -------------------------------------------------------------------------
    # WHAT: Force status to "REVIEW".
    # WHY: Phase 2 extracts requirements; it DOES NOT evaluate bidder compliance.
    status = "REVIEW"

    return RequirementItem(
        requirement_id=req_id,
        category=category,
        description=description,
        required_value=normalized_value,
        unit=unit,
        period=period,
        mandatory=mandatory,
        ambiguous=ambiguous,
        source_document=source_doc,
        page_number=page_num,
        source_text=source_text,
        status=status,
    )
