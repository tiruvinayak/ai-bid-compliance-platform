"""
===============================================================================
MODULE: app/schemas/risk.py
===============================================================================
PURPOSE:
    Defines data models and enumerations for Phase 5 (Risk & Conflict Intelligence).
===============================================================================
"""

from enum import Enum
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field, asdict


class RiskLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class RiskType(str, Enum):
    MANDATORY_EVIDENCE_MISSING = "MANDATORY_EVIDENCE_MISSING"
    MANDATORY_REQUIREMENT_FAILED = "MANDATORY_REQUIREMENT_FAILED"
    EVIDENCE_CONFLICT = "EVIDENCE_CONFLICT"
    IDENTITY_MISMATCH = "IDENTITY_MISMATCH"
    EXPIRED_CERTIFICATE = "EXPIRED_CERTIFICATE"
    NEAR_EXPIRY_CERTIFICATE = "NEAR_EXPIRY_CERTIFICATE"
    LOW_CONFIDENCE_EVIDENCE = "LOW_CONFIDENCE_EVIDENCE"
    AMBIGUOUS_EVIDENCE = "AMBIGUOUS_EVIDENCE"
    MULTIPLE_MISSING_REQUIREMENTS = "MULTIPLE_MISSING_REQUIREMENTS"


@dataclass
class RiskFactorItem:
    factor_name: str
    score_contribution: int
    reason: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class ConflictItem:
    conflict_id: str
    category: str
    field: str
    severity: str
    facts: List[str] = field(default_factory=list)
    evidence: List[Dict[str, Any]] = field(default_factory=list)
    submitted_document: Optional[str] = None
    submitted_value: Optional[str] = None
    verification_source: Optional[str] = None
    verification_value: Optional[str] = None
    reason: str = ""
    requires_manual_review: bool = True

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class RiskItem:
    risk_id: str
    risk_type: str
    severity: str
    score_contribution: int
    requirement_id: Optional[str] = None
    fact_ids: List[str] = field(default_factory=list)
    conflict_id: Optional[str] = None
    reason: str = ""
    evidence: List[Dict[str, Any]] = field(default_factory=list)
    recommended_action: str = ""
    requires_manual_review: bool = True

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class OverallRiskAssessment:
    overall_risk_level: str
    risk_score: int
    review_priority: str
    manual_review_required: bool
    scoring_factors: List[RiskFactorItem] = field(default_factory=list)
    risk_items: List[RiskItem] = field(default_factory=list)
    conflicts: List[ConflictItem] = field(default_factory=list)
    summary_reason: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "overall_risk_level": self.overall_risk_level,
            "risk_score": self.risk_score,
            "review_priority": self.review_priority,
            "manual_review_required": self.manual_review_required,
            "scoring_factors": [f.to_dict() for f in self.scoring_factors],
            "risk_items": [r.to_dict() for r in self.risk_items],
            "conflicts": [c.to_dict() for c in self.conflicts],
            "summary_reason": self.summary_reason,
        }
