"""
===============================================================================
MODULE: app/schemas/__init__.py
===============================================================================
PURPOSE:
    Package initializer for data schemas used across all phases of the AI procurement pipeline.
===============================================================================
"""

from app.schemas.requirement import (
    RequirementCategory,
    RequirementItem,
    ExtractionResult,
    validate_and_normalize_requirement,
)
from app.schemas.bidder_fact import (
    FactCategory,
    BidderFactItem,
    BidderDocumentAnalysisResult,
    validate_and_normalize_fact,
)
from app.schemas.compliance import (
    ComplianceStatus,
    ComplianceEvidenceItem,
    ComplianceResult,
    OverallBidComplianceResult,
)
from app.schemas.risk import (
    RiskLevel,
    RiskType,
    RiskFactorItem,
    ConflictItem,
    RiskItem,
    OverallRiskAssessment,
)
from app.schemas.government_knowledge import (
    GovernmentKnowledgeChunk,
    GovernmentKnowledgeDocument,
)
from app.schemas.government_vector import (
    GovernmentKnowledgeVector,
)
from app.schemas.government_retrieval import (
    GovernmentRetrievalResult,
    GovernmentRetrievalResponse,
)
from app.schemas.government_rag import (
    GovernmentRAGSource,
    GovernmentRAGResponse,
)

__all__ = [
    "RequirementCategory",
    "RequirementItem",
    "ExtractionResult",
    "validate_and_normalize_requirement",
    "FactCategory",
    "BidderFactItem",
    "BidderDocumentAnalysisResult",
    "validate_and_normalize_fact",
    "ComplianceStatus",
    "ComplianceEvidenceItem",
    "ComplianceResult",
    "OverallBidComplianceResult",
    "RiskLevel",
    "RiskType",
    "RiskFactorItem",
    "ConflictItem",
    "RiskItem",
    "OverallRiskAssessment",
    "GovernmentKnowledgeChunk",
    "GovernmentKnowledgeDocument",
    "GovernmentKnowledgeVector",
    "GovernmentRetrievalResult",
    "GovernmentRetrievalResponse",
    "GovernmentRAGSource",
    "GovernmentRAGResponse",
]
