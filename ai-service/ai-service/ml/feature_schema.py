"""Phase 5B — ML feature schema (feature_version v1).

Mirrors Backend MlRiskService.FEATURE_ORDER exactly. The feature order is
part of the training/inference contract: changing it requires a new
feature_version. Features are explainable counts/ratios derived from stored
analysis data only — no protected attributes, no bidder identity shortcuts.
"""

from __future__ import annotations

FEATURE_VERSION = "v1"

FEATURE_ORDER: list[str] = [
    "requirements_passed",
    "requirements_review",
    "requirements_failed",
    "requirements_missing",
    "preliminary_fail_count",
    "preliminary_review_count",
    "expired_document_count",
    "conflict_count",
    "risk_factor_count",
    "high_risk_count",
    "medium_risk_count",
    "low_risk_count",
    "document_count",
    "evidence_coverage",
]

# Binary target: 1 = elevated risk (fraud/conflict flags raised by review),
# 0 = no elevated risk. Populated only from validated historical review data.
LABEL_COLUMN = "risk_label"

MIN_DATASET_ROWS = 30


def validate_feature_row(row: dict) -> list[str]:
    """Returns a list of problems; empty list means the row is valid."""
    problems: list[str] = []
    for name in FEATURE_ORDER:
        if name not in row:
            problems.append(f"missing feature: {name}")
            continue
        value = row[name]
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            problems.append(f"feature {name} must be numeric, got {type(value).__name__}")
            continue
        if value != value:  # NaN
            problems.append(f"feature {name} is NaN")
    coverage = row.get("evidence_coverage")
    if isinstance(coverage, (int, float)) and not isinstance(coverage, bool):
        if coverage < 0.0 or coverage > 1.0:
            problems.append("evidence_coverage must be within [0, 1]")
    return problems
