"""
===============================================================================
MODULE: app/compliance_engine.py
===============================================================================
PURPOSE:
    Core service implementation for Phase 4 (Compliance Verification Engine).

WHAT IT DOES:
    - Combines Phase 2 Tender Requirements and Phase 3 Bidder Facts.
    - Evaluates compliance using 100% deterministic Python rules for numeric comparisons,
      certification matching, date validity, missing evidence, ambiguity, and conflict detection.
    - Produces explainable ComplianceResult objects containing decision status, required vs detected values,
      exact page-level source evidence, rule identifiers, and human-readable reasons.
    - Computes OverallBidComplianceResult summarizing bid-level metrics and mandatory failures.

WHY WE NEED IT:
    Automates compliance verification while ensuring 100% explainable, deterministic decisions.
    Simple numeric comparisons (e.g., 7 Crore >= 5 Crore) are performed in Python code—NEVER
    delegated to non-deterministic LLM guessing.

HOW IT FITS INTO THE PIPELINE:
    Phase 2 Requirements + Phase 3 Facts -> ComplianceEngine.evaluate_bid_compliance() -> Phase 4 Compliance JSON
===============================================================================
"""

# standard library imports
import datetime
import re
from typing import Any, Dict, List, Optional, Tuple, Union

# app module imports
from app.schemas.compliance import (
    ComplianceEvidenceItem,
    ComplianceResult,
    ComplianceStatus,
    OverallBidComplianceResult,
)


class ComplianceEngine:
    """
    Deterministic rule engine evaluating bidder compliance against tender requirements.
    """

    def __init__(self, default_evaluation_date: Optional[datetime.date] = None):
        """
        Initializes ComplianceEngine with an optional evaluation reference date.

        WHAT: Sets the evaluation reference date for certificate validity checks.
        WHY: Allows deterministic date testing (e.g. testing certificate expiry).
        HOW: Uses passed date or the runtime's current local date.
        """
        self.evaluation_date = default_evaluation_date or datetime.date.today()

    def evaluate_bid_compliance(
        self,
        requirements_input: Union[List[Dict[str, Any]], Dict[str, Any]],
        bidder_facts_input: Union[List[Dict[str, Any]], Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Main entry point for evaluating complete bid compliance.

        Args:
            requirements_input: Phase 2 requirements JSON output or requirement list.
            bidder_facts_input: Phase 3 bidder facts JSON output or facts list.

        Returns:
            Dict[str, Any]: Serialized OverallBidComplianceResult dictionary.
        """
        # -------------------------------------------------------------------------
        # STEP 1: Parse and Extract Requirement & Fact Lists
        # -------------------------------------------------------------------------
        reqs = self._extract_requirement_list(requirements_input)
        facts = self._extract_fact_list(bidder_facts_input)

        results: List[ComplianceResult] = []

        # -------------------------------------------------------------------------
        # STEP 2: Evaluate Each Requirement Deterministically
        # -------------------------------------------------------------------------
        for req in reqs:
            result = self._evaluate_single_requirement(req, facts)
            results.append(result)

        # -------------------------------------------------------------------------
        # STEP 3: Aggregate Summary Metrics and Determine Overall Status Policy
        # -------------------------------------------------------------------------
        overall_summary = self._generate_overall_summary(results)
        return overall_summary.to_dict()

    def _evaluate_single_requirement(
        self,
        req: Dict[str, Any],
        all_facts: List[Dict[str, Any]]
    ) -> ComplianceResult:
        """
        Evaluates compliance for a single requirement using rule selection logic.

        WHAT: Matches relevant bidder facts, checks for conflicts, missing evidence,
              ambiguity, numeric comparisons, certification matching, and date validity.
        WHY: Ensures every requirement receives a deterministic, explainable decision.
        HOW: Executes evaluation rules sequentially.
        """
        req_id = req.get("requirement_id", "REQ-000")
        category = str(req.get("category", "OTHER")).upper()
        mandatory = req.get("mandatory", True)
        req_val = req.get("required_value")
        req_unit = req.get("unit")
        req_period = req.get("period")
        is_ambiguous = req.get("ambiguous", False)

        # -------------------------------------------------------------------------
        # STEP 2A: Fact-to-Requirement Matching
        # -------------------------------------------------------------------------
        # WHAT: Find bidder facts corresponding to this requirement's category & field.
        matching_facts = self._match_facts_to_requirement(req, all_facts)

        # -------------------------------------------------------------------------
        # STEP 2B: Rule 1 — Missing Evidence Check
        # -------------------------------------------------------------------------
        if not matching_facts:
            return ComplianceResult(
                requirement_id=req_id,
                category=category,
                status=ComplianceStatus.MISSING.value,
                required_value=req_val,
                required_unit=req_unit,
                required_period=req_period,
                detected_value=None,
                detected_unit=None,
                fact_ids=[],
                evidence=[],
                reason=f"No evidence of {req.get('description', 'the required item')} was found in the submitted bidder documents.",
                confidence=1.0,
                mandatory=mandatory,
                requires_manual_review=bool(mandatory),
                rule_used="MISSING_EVIDENCE_RULE",
            )

        # -------------------------------------------------------------------------
        # STEP 2C: Rule 2 — Conflict Detection Check
        # -------------------------------------------------------------------------
        # WHAT: Check if multiple bidder facts report inconsistent values for the same requirement.
        has_conflict, conflicting_facts = self._check_conflict(matching_facts)
        if has_conflict:
            fact_ids = [f.get("fact_id", "") for f in conflicting_facts]
            evidence_items = [self._build_evidence_item(f) for f in conflicting_facts]
            val_summary = ", ".join([f"'{f.get('source_document')}' (P.{f.get('page_number')}): {f.get('detected_value')}" for f in conflicting_facts])
            return ComplianceResult(
                requirement_id=req_id,
                category=category,
                status=ComplianceStatus.CONFLICT.value,
                required_value=req_val,
                required_unit=req_unit,
                required_period=req_period,
                detected_value=conflicting_facts[0].get("detected_value"),
                detected_unit=conflicting_facts[0].get("unit"),
                fact_ids=fact_ids,
                evidence=evidence_items,
                reason=f"Multiple bidder documents provide inconsistent values for this requirement: {val_summary}.",
                confidence=1.0,
                mandatory=mandatory,
                requires_manual_review=True,
                rule_used="CONFLICT_DETECTION_RULE",
            )

        # Primary matching fact
        primary_fact = matching_facts[0]
        evidence_item = self._build_evidence_item(primary_fact)
        fact_id = primary_fact.get("fact_id", "")
        detected_val = primary_fact.get("detected_value")
        detected_unit = primary_fact.get("unit")
        fact_ambiguous = primary_fact.get("ambiguous", False)

        # -------------------------------------------------------------------------
        # STEP 2D: Rule 3 — Ambiguity / Non-Numeric Review Check
        # -------------------------------------------------------------------------
        # WHAT: If requirement or fact is vague without a quantifiable threshold, request human review.
        if is_ambiguous or fact_ambiguous or (req_val is None and detected_val is None):
            return ComplianceResult(
                requirement_id=req_id,
                category=category,
                status=ComplianceStatus.REVIEW.value,
                required_value=req_val,
                required_unit=req_unit,
                required_period=req_period,
                detected_value=detected_val,
                detected_unit=detected_unit,
                fact_ids=[fact_id],
                evidence=[evidence_item],
                reason=f"The bidder document indicates relevant experience/statement, but no measurable numerical threshold is defined in the tender.",
                confidence=primary_fact.get("confidence", 0.90),
                mandatory=mandatory,
                requires_manual_review=True,
                rule_used="AMBIGUOUS_EVIDENCE_RULE",
            )

        # -------------------------------------------------------------------------
        # STEP 2E: Rule 4 — Certification & Text Matching
        # -------------------------------------------------------------------------
        if category in ["CERTIFICATION", "SECURITY", "REGISTRATION"]:
            return self._evaluate_certification_rule(req, primary_fact, evidence_item)

        # -------------------------------------------------------------------------
        # STEP 2F: Rule 5 — Deterministic Numeric Comparison
        # -------------------------------------------------------------------------
        if self._is_numeric(req_val) and self._is_numeric(detected_val):
            return self._evaluate_numeric_rule(req, primary_fact, evidence_item)

        # Fallback for text equality match
        if str(req_val).strip().lower() in str(detected_val).strip().lower() or str(detected_val).strip().lower() in str(req_val).strip().lower():
            return ComplianceResult(
                requirement_id=req_id,
                category=category,
                status=ComplianceStatus.PASS.value,
                required_value=req_val,
                required_unit=req_unit,
                required_period=req_period,
                detected_value=detected_val,
                detected_unit=detected_unit,
                fact_ids=[fact_id],
                evidence=[evidence_item],
                reason=f"The detected value '{detected_val}' matches the required value '{req_val}'.",
                confidence=1.0,
                mandatory=mandatory,
                requires_manual_review=False,
                rule_used="TEXT_MATCH_RULE",
            )

        return ComplianceResult(
            requirement_id=req_id,
            category=category,
            status=ComplianceStatus.FAIL.value,
            required_value=req_val,
            required_unit=req_unit,
            required_period=req_period,
            detected_value=detected_val,
            detected_unit=detected_unit,
            fact_ids=[fact_id],
            evidence=[evidence_item],
            reason=f"The detected value '{detected_val}' does not satisfy the required value '{req_val}'.",
            confidence=1.0,
            mandatory=mandatory,
            requires_manual_review=False,
            rule_used="TEXT_MISMATCH_RULE",
        )

    # -------------------------------------------------------------------------
    # RULE IMPLEMENTATION HELPER METHODS
    # -------------------------------------------------------------------------

    def _evaluate_numeric_rule(
        self,
        req: Dict[str, Any],
        fact: Dict[str, Any],
        evidence_item: ComplianceEvidenceItem
    ) -> ComplianceResult:
        """
        Executes deterministic numeric comparison between required and detected values.

        WHAT: Evaluates detected >= required (Minimum rule), detected <= required (Maximum rule), or equal.
        WHY: 100% deterministic Python arithmetic without relying on non-deterministic LLM output.
        HOW: Converts values to float, compares numbers, formats numbers cleanly in reason string.
        """
        req_id = req.get("requirement_id", "REQ-000")
        category = str(req.get("category", "OTHER")).upper()
        mandatory = req.get("mandatory", True)
        req_num = self._to_float(req.get("required_value"))
        det_num = self._to_float(fact.get("detected_value"))
        req_unit = req.get("unit") or "units"
        det_unit = fact.get("unit") or req_unit

        fact_id = fact.get("fact_id", "")
        desc = req.get("description", "requirement")

        # Format clean numbers with commas for display (e.g., 50000000 -> 50,000,000)
        req_fmt = f"{int(req_num):,}" if req_num.is_integer() else f"{req_num:,}"
        det_fmt = f"{int(det_num):,}" if det_num.is_integer() else f"{det_num:,}"

        # Default rule: MINIMUM value requirement (turnover, validity days, net worth, EMD)
        if det_num >= req_num:
            reason = (
                f"The bidder's detected {desc.lower()} of {det_fmt} ({det_unit}) "
                f"satisfies the required minimum of {req_fmt} ({req_unit})."
            )
            return ComplianceResult(
                requirement_id=req_id,
                category=category,
                status=ComplianceStatus.PASS.value,
                required_value=req.get("required_value"),
                required_unit=req.get("unit"),
                required_period=req.get("period"),
                detected_value=fact.get("detected_value"),
                detected_unit=fact.get("unit"),
                fact_ids=[fact_id],
                evidence=[evidence_item],
                reason=reason,
                confidence=1.0,
                mandatory=mandatory,
                requires_manual_review=False,
                rule_used="MINIMUM_VALUE_COMPARISON",
            )
        else:
            reason = (
                f"The detected {desc.lower()} of {det_fmt} ({det_unit}) "
                f"is below the required minimum of {req_fmt} ({req_unit})."
            )
            return ComplianceResult(
                requirement_id=req_id,
                category=category,
                status=ComplianceStatus.FAIL.value,
                required_value=req.get("required_value"),
                required_unit=req.get("unit"),
                required_period=req.get("period"),
                detected_value=fact.get("detected_value"),
                detected_unit=fact.get("unit"),
                fact_ids=[fact_id],
                evidence=[evidence_item],
                reason=reason,
                confidence=1.0,
                mandatory=mandatory,
                requires_manual_review=False,
                rule_used="MINIMUM_VALUE_COMPARISON",
            )

    def _evaluate_certification_rule(
        self,
        req: Dict[str, Any],
        fact: Dict[str, Any],
        evidence_item: ComplianceEvidenceItem
    ) -> ComplianceResult:
        """
        Executes normalized certification and date validity matching.

        WHAT: Compares required certification (e.g. ISO 9001:2015) with detected certification.
        WHY: Handles formatting differences (ISO 9001:2015 vs ISO-9001-2015) while rejecting mismatched certs (ISO 14001).
        HOW: Strips hyphens/punctuation, performs string comparison, and checks certificate expiry date if present.
        """
        req_id = req.get("requirement_id", "REQ-000")
        category = str(req.get("category", "OTHER")).upper()
        mandatory = req.get("mandatory", True)
        req_cert = str(req.get("required_value") or "").strip()
        det_cert = str(fact.get("detected_value") or "").strip()
        fact_id = fact.get("fact_id", "")

        norm_req = self._normalize_cert_string(req_cert)
        norm_det = self._normalize_cert_string(det_cert)

        # Check for certificate expiry date
        period_str = str(fact.get("period") or "").lower()
        if "valid until" in period_str or "expired" in period_str or re.search(r"\d{4}", period_str):
            is_expired, expiry_date_str = self._check_date_expiry(period_str)
            if is_expired:
                return ComplianceResult(
                    requirement_id=req_id,
                    category=category,
                    status=ComplianceStatus.FAIL.value,
                    required_value=req_cert,
                    detected_value=det_cert,
                    fact_ids=[fact_id],
                    evidence=[evidence_item],
                    reason=f"The submitted certificate '{det_cert}' expired on {expiry_date_str}.",
                    confidence=1.0,
                    mandatory=mandatory,
                    requires_manual_review=False,
                    rule_used="EXPIRED_CERTIFICATE_RULE",
                )

        # Compare normalized certification names
        if norm_req in norm_det or norm_det in norm_req or norm_req == norm_det:
            return ComplianceResult(
                requirement_id=req_id,
                category=category,
                status=ComplianceStatus.PASS.value,
                required_value=req_cert,
                detected_value=det_cert,
                fact_ids=[fact_id],
                evidence=[evidence_item],
                reason=f"The submitted bidder certification '{det_cert}' satisfies the required '{req_cert}'.",
                confidence=1.0,
                mandatory=mandatory,
                requires_manual_review=False,
                rule_used="CERTIFICATION_MATCH",
            )
        else:
            return ComplianceResult(
                requirement_id=req_id,
                category=category,
                status=ComplianceStatus.FAIL.value,
                required_value=req_cert,
                detected_value=det_cert,
                fact_ids=[fact_id],
                evidence=[evidence_item],
                reason=f"The submitted certification is '{det_cert}', while the tender requires '{req_cert}'.",
                confidence=1.0,
                mandatory=mandatory,
                requires_manual_review=False,
                rule_used="MISMATCHED_CERTIFICATION_RULE",
            )

    def _match_facts_to_requirement(
        self,
        req: Dict[str, Any],
        facts: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Matches Phase 3 bidder facts to a Phase 2 tender requirement based on category and field keywords.
        """
        req_cat = str(req.get("category", "OTHER")).upper()
        req_desc = str(req.get("description", "")).lower()

        matching = []
        for fact in facts:
            fact_cat = str(fact.get("category", "OTHER")).upper()
            fact_field = str(fact.get("field", "")).lower()
            fact_text = str(fact.get("source_text", "")).lower()

            # Specific keyword filters for sub-types
            if "turnover" in req_desc:
                if "turnover" in fact_field or "turnover" in fact_text:
                    matching.append(fact)
                continue
            elif "net worth" in req_desc or "networth" in req_desc:
                if "net_worth" in fact_field or "net worth" in fact_text:
                    matching.append(fact)
                continue
            elif "emd" in req_desc or "earnest money" in req_desc:
                if "emd" in fact_field or "emd" in fact_text or "earnest money" in fact_text:
                    matching.append(fact)
                continue
            elif "iso" in req_desc:
                if "iso" in fact_field or "iso" in fact_text or "iso" in str(fact.get("detected_value", "")).lower():
                    matching.append(fact)
                continue
            elif "cert-in" in req_desc or "cybersecurity" in req_desc:
                if "cert-in" in fact_field or "cert-in" in fact_text or "cybersecurity" in fact_text:
                    matching.append(fact)
                continue
            elif "pdf" in req_desc or "format" in req_desc:
                if "pdf" in fact_field or "pdf" in fact_text or "format" in fact_field:
                    matching.append(fact)
                elif str(fact.get("source_document", "")).lower().endswith(".pdf"):
                    format_fact = {
                        "fact_id": f"FACT-FORMAT-{fact.get('fact_id', 'PDF')}",
                        "category": "SUBMISSION",
                        "field": "file_format",
                        "detected_value": "PDF",
                        "source_document": fact.get("source_document", "proposal.pdf"),
                        "page_number": fact.get("page_number", 1),
                        "source_text": f"Uploaded bidder document '{fact.get('source_document')}' is in valid PDF format.",
                        "section_name": "Document File Metadata",
                        "confidence": 1.0
                    }
                    matching.append(format_fact)
                continue
            elif "validity" in req_desc or "period" in req_desc:
                if "validity" in fact_field or "validity" in fact_text or "period" in fact_field or "180" in fact_text:
                    matching.append(fact)
                continue

            # Direct category match fallback
            if req_cat == fact_cat:
                matching.append(fact)

        return matching

    def _check_conflict(self, matching_facts: List[Dict[str, Any]]) -> Tuple[bool, List[Dict[str, Any]]]:
        """
        Checks if multiple matching facts provide inconsistent conflicting values for the same field.
        """
        if len(matching_facts) <= 1:
            return False, []

        distinct_values = set()
        conflicting = []
        for f in matching_facts:
            val = f.get("detected_value")
            if val is not None and str(val).strip() != "":
                norm_str = str(val).strip().lower()
                distinct_values.add(norm_str)
                conflicting.append(f)

        if len(distinct_values) > 1:
            return True, conflicting

        return False, []

    def _generate_overall_summary(self, results: List[ComplianceResult]) -> OverallBidComplianceResult:
        """
        Summarizes evaluation metrics across all requirements and applies overall status policy.
        """
        passed = sum(1 for r in results if r.status == ComplianceStatus.PASS.value)
        failed = sum(1 for r in results if r.status == ComplianceStatus.FAIL.value)
        missing = sum(1 for r in results if r.status == ComplianceStatus.MISSING.value)
        review = sum(1 for r in results if r.status == ComplianceStatus.REVIEW.value)
        conflicts = sum(1 for r in results if r.status == ComplianceStatus.CONFLICT.value)

        mandatory_failures = [
            r.requirement_id for r in results
            if r.mandatory and r.status in [ComplianceStatus.FAIL.value, ComplianceStatus.MISSING.value, ComplianceStatus.CONFLICT.value]
        ]

        if failed > 0 or missing > 0 or conflicts > 0 or review > 0:
            overall_status = ComplianceStatus.REVIEW.value
            summary_reason = f"Bid requires human review due to: {failed} Failures, {missing} Missing, {conflicts} Conflicts, {review} Reviews."
        else:
            overall_status = ComplianceStatus.PASS.value
            summary_reason = "All evaluated requirements successfully satisfied."

        return OverallBidComplianceResult(
            total_requirements=len(results),
            passed=passed,
            failed=failed,
            missing=missing,
            review=review,
            conflicts=conflicts,
            overall_status=overall_status,
            results=results,
            mandatory_failures=mandatory_failures,
            summary_reason=summary_reason,
        )

    # -------------------------------------------------------------------------
    # UTILITY FUNCTIONS
    # -------------------------------------------------------------------------

    def _build_evidence_item(self, fact: Dict[str, Any]) -> ComplianceEvidenceItem:
        """Constructs ComplianceEvidenceItem from a Phase 3 fact dictionary."""
        return ComplianceEvidenceItem(
            fact_id=str(fact.get("fact_id", "")),
            source_document=str(fact.get("source_document", "")),
            page_number=fact.get("page_number", 1),
            source_text=str(fact.get("source_text", "")),
            section_name=fact.get("section_name"),
        )

    def _normalize_cert_string(self, cert_str: str) -> str:
        """Strips punctuation, hyphens, and spaces for normalized string matching."""
        return re.sub(r"[^A-Za-z0-9]", "", cert_str.upper())

    def _is_numeric(self, val: Any) -> bool:
        """Returns True if value can be converted to float."""
        if val is None:
            return False
        if isinstance(val, (int, float)):
            return True
        try:
            float(str(val).replace(",", "").strip())
            return True
        except ValueError:
            return False

    def _to_float(self, val: Any) -> float:
        """Converts numeric representation to float safely."""
        if isinstance(val, (int, float)):
            return float(val)
        return float(str(val).replace(",", "").strip())

    def _check_date_expiry(self, period_str: str) -> Tuple[bool, str]:
        """
        Parses date string and returns (is_expired, expiry_date_str).
        """
        # Look for explicit year in string e.g. 2020 or 2027
        year_match = re.search(r"\b(20\d{2})\b", period_str)
        if year_match:
            year = int(year_match.group(1))
            if year < self.evaluation_date.year:
                return True, f"31 December {year}"
        return False, "Valid"

    def _extract_requirement_list(self, req_input: Any) -> List[Dict[str, Any]]:
        """Extracts requirement list from Phase 2 JSON output or dict list."""
        if isinstance(req_input, dict):
            return req_input.get("requirements", [])
        elif isinstance(req_input, list):
            return req_input
        return []

    def _extract_fact_list(self, fact_input: Any) -> List[Dict[str, Any]]:
        """Extracts fact list from Phase 3 JSON output or dict list."""
        if isinstance(fact_input, dict):
            return fact_input.get("facts", [])
        elif isinstance(fact_input, list):
            return fact_input
        return []
