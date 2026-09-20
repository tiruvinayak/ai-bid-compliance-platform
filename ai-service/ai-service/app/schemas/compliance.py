"""
===============================================================================
MODULE: app/schemas/compliance.py
===============================================================================
PURPOSE:
    Defines the standard schemas and data models for compliance decisions and
    evidence trails evaluated during Phase 4 (Compliance Verification Engine).

WHAT IT DOES:
    - Defines ComplianceStatus Enum (PASS, FAIL, REVIEW, MISSING, CONFLICT).
    - Defines ComplianceEvidenceItem data model for page-level source traceability.
    - Defines ComplianceResult data model representing the decision for a single tender requirement.
    - Defines OverallBidComplianceResult container model summarizing total bid evaluation metrics.

WHY WE NEED IT:
    Phase 4 evaluates tender requirements against extracted bidder facts.
    These schemas enforce a transparent, explainable audit trail where every decision
    is accompanied by required vs. detected values, rule names, evidence quotes, and reasons.

HOW IT FITS INTO THE PIPELINE:
    Phase 2 Requirements + Phase 3 Facts -> ComplianceEngine -> app.schemas.compliance -> Final Compliance JSON
===============================================================================
"""

# standard library imports
from enum import Enum
from typing import Any, Dict, List, Optional, Union
from dataclasses import dataclass, field, asdict


class ComplianceStatus(str, Enum):
    """
    Primary status enumeration for compliance evaluation decisions.

    WHAT: Allowed decision classifications for each tender requirement.
    WHY: Standardizes status names across the platform for UI display and reporting.
    HOW:
        PASS     -> Evidence satisfies requirement.
        FAIL     -> Evidence clearly does not satisfy requirement.
        REVIEW   -> Evidence exists or statement is vague; requires human officer review.
        MISSING  -> Required evidence/fact was not found in bidder documents.
        CONFLICT -> Multiple facts provide inconsistent conflicting values.
    """
    PASS = "PASS"
    FAIL = "FAIL"
    REVIEW = "REVIEW"
    MISSING = "MISSING"
    CONFLICT = "CONFLICT"


@dataclass
class ComplianceEvidenceItem:
    """
    Data model representing a single piece of evidence supporting a compliance decision.

    FIELDS EXPLAINED:
        fact_id: ID of the underlying Phase 3 bidder fact (e.g., "FACT-002").
        source_document: Name of the bidder PDF document (e.g., "bidder_financial.pdf").
        page_number: 1-based page number where evidence was located.
        source_text: Exact or direct excerpt text from the original bidder document.
        section_name: Section or header title where evidence was located (if available).
    """
    fact_id: str
    source_document: str
    page_number: Optional[int] = 1
    source_text: str = ""
    section_name: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Converts evidence item to dictionary."""
        return asdict(self)


@dataclass
class ComplianceResult:
    """
    Data model representing the evaluation decision for a single tender requirement.

    FIELDS EXPLAINED:
        requirement_id: ID of the target requirement (e.g., "REQ-001").
        category: Requirement category (e.g., "FINANCIAL", "CERTIFICATION").
        status: Evaluation status string ("PASS", "FAIL", "REVIEW", "MISSING", "CONFLICT").
        required_value: Value required by tender (e.g., 50000000 or "ISO 9001:2015").
        required_unit: Unit required by tender (e.g., "INR", "days").
        required_period: Time period specified by tender (e.g., "last 3 fiscal years").
        detected_value: Value detected in bidder documents (e.g., 70000000).
        detected_unit: Unit detected in bidder documents (e.g., "INR").
        fact_ids: List of Phase 3 fact IDs used in making this decision.
        evidence: List of ComplianceEvidenceItem objects containing page traceability.
        reason: Human-readable explanation of why this decision was reached.
        confidence: Confidence score of the evaluation between 0.0 and 1.0.
        mandatory: True if requirement is mandatory, False if optional, None if unclear.
        requires_manual_review: True if human officer review is required.
        rule_used: Identifier of the rule used (e.g., "MINIMUM_VALUE_COMPARISON", "CERTIFICATION_MATCH").
    """
    requirement_id: str
    category: str
    status: str
    required_value: Optional[Union[int, float, str]] = None
    required_unit: Optional[str] = None
    required_period: Optional[str] = None
    detected_value: Optional[Union[int, float, str]] = None
    detected_unit: Optional[str] = None
    fact_ids: List[str] = field(default_factory=list)
    evidence: List[ComplianceEvidenceItem] = field(default_factory=list)
    reason: str = ""
    confidence: Optional[float] = 1.0
    mandatory: Optional[bool] = True
    requires_manual_review: bool = False
    rule_used: str = "DETERMINISTIC_RULE"

    def to_dict(self) -> Dict[str, Any]:
        """
        Converts ComplianceResult into a clean Python dictionary for JSON output.
        """
        return {
            "requirement_id": self.requirement_id,
            "category": self.category,
            "status": self.status,
            "required_value": self.required_value,
            "required_unit": self.required_unit,
            "required_period": self.required_period,
            "detected_value": self.detected_value,
            "detected_unit": self.detected_unit,
            "fact_ids": self.fact_ids,
            "evidence": [e.to_dict() for e in self.evidence],
            "reason": self.reason,
            "confidence": self.confidence,
            "mandatory": self.mandatory,
            "requires_manual_review": self.requires_manual_review,
            "rule_used": self.rule_used,
        }


@dataclass
class OverallBidComplianceResult:
    """
    Container model summarizing overall bid compliance metrics across all evaluated requirements.
    """
    total_requirements: int
    passed: int
    failed: int
    missing: int
    review: int
    conflicts: int
    overall_status: str  # PASS, FAIL, REVIEW
    results: List[ComplianceResult] = field(default_factory=list)
    mandatory_failures: List[str] = field(default_factory=list)
    summary_reason: str = ""

    def to_dict(self) -> Dict[str, Any]:
        """
        Serializes the complete overall bid compliance result into a dictionary.
        """
        return {
            "total_requirements": self.total_requirements,
            "passed": self.passed,
            "failed": self.failed,
            "missing": self.missing,
            "review": self.review,
            "conflicts": self.conflicts,
            "overall_status": self.overall_status,
            "results": [r.to_dict() for r in self.results],
            "mandatory_failures": self.mandatory_failures,
            "summary_reason": self.summary_reason,
        }
