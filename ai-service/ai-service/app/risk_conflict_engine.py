"""
===============================================================================
MODULE: app/risk_conflict_engine.py
===============================================================================
PURPOSE:
    Core service implementation for Phase 5 (Risk & Conflict Intelligence).

WHAT IT DOES:
    - Analyzes Phase 3 extracted bidder facts and Phase 4 compliance results.
    - Deterministically detects data conflicts across bidder documents (turnover, certs, net worth).
    - Performs company identity normalization and flags company name mismatches.
    - Evaluates expired certificates, near-expiry certificates (within 30 days), and low-confidence facts (< 0.60).
    - Evaluates missing mandatory requirements, failed mandatory requirements, and unquantified statements.
    - Computes a 100% transparent, explainable 0-100 risk score and assigns officer review priorities (LOW, MEDIUM, HIGH).
    - Generates clear, actionable officer recommendations without making fraud accusations.

WHY WE NEED IT:
    Assists government procurement officers by highlighting high-risk situations,
    conflicts, and missing evidence so human review is focused where it matters most.

HOW IT FITS INTO THE PIPELINE:
    Phase 3 Facts + Phase 4 Compliance -> RiskConflictEngine -> Phase 5 Risk Assessment JSON
===============================================================================
"""

# standard library imports
import datetime
import os
import re
from typing import Any, Dict, List, Optional, Tuple, Union

# app module imports
from app.schemas.risk import (
    ConflictItem,
    OverallRiskAssessment,
    RiskFactorItem,
    RiskItem,
    RiskLevel,
    RiskType,
)


class RiskConflictEngine:
    """
    Deterministic risk and conflict intelligence service for procurement audit pipelines.
    """

    def __init__(self, default_evaluation_date: Optional[datetime.date] = None):
        """
        Initializes RiskConflictEngine with an optional evaluation reference date.

        WHAT: Sets the reference date for evaluating certificate expiry and near-expiry windows.
        WHY: Ensures reproducible deterministic risk evaluation.
        HOW: Uses passed date or the runtime's current local date.
        """
        self.evaluation_date = default_evaluation_date or datetime.date.today()

    def assess_bid_risk(
        self,
        facts_input: Union[List[Dict[str, Any]], Dict[str, Any]],
        compliance_input: Union[List[Dict[str, Any]], Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Main entry point for evaluating comprehensive bid risk and conflict intelligence.

        Args:
            facts_input: Phase 3 bidder facts JSON output or list of facts.
            compliance_input: Phase 4 compliance JSON output or list of compliance results.

        Returns:
            Dict[str, Any]: Serialized OverallRiskAssessment dictionary.
        """
        # -------------------------------------------------------------------------
        # STEP 1: Parse Input Fact & Compliance Result Lists
        # -------------------------------------------------------------------------
        facts = self._extract_fact_list(facts_input)
        compliance_results, compliance_meta = self._extract_compliance_data(compliance_input)

        conflicts: List[ConflictItem] = []
        risk_items: List[RiskItem] = []
        scoring_factors: List[RiskFactorItem] = []

        risk_counter = 1
        conflict_counter = 1

        # -------------------------------------------------------------------------
        # STEP 2: Detect Data Conflicts Across Bidder Documents
        # -------------------------------------------------------------------------
        data_conflicts, data_risk_items, conflict_counter, risk_counter = self._detect_data_conflicts(
            facts, conflict_counter, risk_counter
        )
        conflicts.extend(data_conflicts)
        risk_items.extend(data_risk_items)

        # -------------------------------------------------------------------------
        # STEP 3: Detect Company Identity Mismatches Across Bidder Documents
        # -------------------------------------------------------------------------
        identity_conflicts, identity_risk_items, conflict_counter, risk_counter = self._detect_identity_conflicts(
            facts, conflict_counter, risk_counter
        )
        conflicts.extend(identity_conflicts)
        risk_items.extend(identity_risk_items)

        # -------------------------------------------------------------------------
        # STEP 4: Evaluate Compliance Decision Risks (Missing, Fail, Review)
        # -------------------------------------------------------------------------
        comp_risk_items, risk_counter = self._evaluate_compliance_risks(
            compliance_results, risk_counter
        )
        risk_items.extend(comp_risk_items)

        # -------------------------------------------------------------------------
        # STEP 5: Evaluate Certificate Risks (Expired / Near-Expiry)
        # -------------------------------------------------------------------------
        cert_risk_items, risk_counter = self._evaluate_certificate_risks(
            facts, risk_counter
        )
        risk_items.extend(cert_risk_items)

        # -------------------------------------------------------------------------
        # STEP 6: Evaluate Low Confidence Fact Risks (< 0.60)
        # -------------------------------------------------------------------------
        conf_risk_items, risk_counter = self._evaluate_confidence_risks(
            facts, risk_counter
        )
        risk_items.extend(conf_risk_items)

        # -------------------------------------------------------------------------
        # STEP 7: Calculate Deterministic Risk Score, Risk Level, and Priority
        # -------------------------------------------------------------------------
        overall_assessment = self._calculate_risk_score_and_priority(
            risk_items, conflicts
        )
        return overall_assessment.to_dict()

    # -------------------------------------------------------------------------
    # DETAILED RISK EVALUATION SUB-MODULES
    # -------------------------------------------------------------------------

    def _detect_data_conflicts(
        self,
        facts: List[Dict[str, Any]],
        conflict_counter: int,
        risk_counter: int
    ) -> Tuple[List[ConflictItem], List[RiskItem], int, int]:
        """
        Detects conflicting quantitative or string values for the same field across different bidder documents.

        WHAT: Groups facts by field (e.g. annual_turnover, net_worth) and checks for differing values.
        WHY: Multiple documents reporting different numbers is a high-priority risk requiring human verification.
        HOW: Compares normalized detected values from distinct source documents.
        """
        conflicts: List[ConflictItem] = []
        risk_items: List[RiskItem] = []

        # Group facts by field name
        field_groups: Dict[str, List[Dict[str, Any]]] = {}
        for f in facts:
            field_name = str(f.get("field") or "").lower().strip()
            if not field_name or field_name == "company_name":
                continue
            field_groups.setdefault(field_name, []).append(f)

        for field_name, group_facts in field_groups.items():
            if len(group_facts) <= 1:
                continue

            # Compare distinct non-null detected values
            val_to_facts: Dict[str, List[Dict[str, Any]]] = {}
            for f in group_facts:
                val = f.get("detected_value")
                if val is not None and str(val).strip() != "":
                    norm_val = str(val).strip().lower()
                    val_to_facts.setdefault(norm_val, []).append(f)

            if len(val_to_facts) > 1:
                cid = f"CONFLICT-{conflict_counter:03d}"
                conflict_counter += 1

                fact_ids = [f.get("fact_id", "") for f in group_facts]
                evidence_list = [self._build_evidence_dict(f) for f in group_facts]

                distinct_groups = list(val_to_facts.items())
                val_1, facts_1 = distinct_groups[0]
                val_2, facts_2 = distinct_groups[1]

                raw_doc_1 = str(facts_1[0].get("source_document") or "Bidder Filing")
                raw_doc_2 = str(facts_2[0].get("source_document") or "Verification Registry")
                doc_1 = os.path.basename(raw_doc_1)
                doc_2 = os.path.basename(raw_doc_2)
                raw_val_1 = str(facts_1[0].get("detected_value") or "")
                raw_val_2 = str(facts_2[0].get("detected_value") or "")

                cat = str(group_facts[0].get("category", "OTHER")).upper()
                reason = f"Cross-document discrepancy detected for field '{field_name.upper()}': {doc_1} (Page {facts_1[0].get('page_number', 1)}) reports '{raw_val_1}', whereas {doc_2} (Page {facts_2[0].get('page_number', 1)}) reports '{raw_val_2}'."

                conflicts.append(ConflictItem(
                    conflict_id=cid,
                    category=cat,
                    field=field_name,
                    severity=RiskLevel.HIGH.value,
                    facts=fact_ids,
                    evidence=evidence_list,
                    submitted_document=doc_1,
                    submitted_value=raw_val_1,
                    verification_source=doc_2,
                    verification_value=raw_val_2,
                    reason=reason,
                    requires_manual_review=True,
                ))

                rid = f"RISK-{risk_counter:03d}"
                risk_counter += 1

                risk_items.append(RiskItem(
                    risk_id=rid,
                    risk_type=RiskType.EVIDENCE_CONFLICT.value,
                    severity=RiskLevel.HIGH.value,
                    score_contribution=30,
                    fact_ids=fact_ids,
                    conflict_id=cid,
                    reason=reason,
                    evidence=evidence_list,
                    recommended_action="Verify financial/tender documents to determine the authoritative value.",
                    requires_manual_review=True,
                ))

        return conflicts, risk_items, conflict_counter, risk_counter

    def _detect_identity_conflicts(
        self,
        facts: List[Dict[str, Any]],
        conflict_counter: int,
        risk_counter: int
    ) -> Tuple[List[ConflictItem], List[RiskItem], int, int]:
        """
        Compares company identity across submitted bidder documents using legal name normalization.

        WHAT: Detects company name discrepancies between submitted documents.
        WHY: Ensures company identity is consistent across financial, tax, and certificate dossiers.
        HOW: Normalizes names (stripping 'PVT LTD', 'PRIVATE LIMITED', punctuation) before comparing.
        """
        conflicts: List[ConflictItem] = []
        risk_items: List[RiskItem] = []

        identity_facts = [
            f for f in facts
            if str(f.get("category", "")).upper() == "IDENTITY" or str(f.get("field", "")).lower() == "company_name"
        ]

        if len(identity_facts) <= 1:
            return conflicts, risk_items, conflict_counter, risk_counter

        norm_to_facts: Dict[str, List[Dict[str, Any]]] = {}
        for f in identity_facts:
            raw_name = str(f.get("detected_value") or "").strip()
            if raw_name:
                norm_name = self._normalize_company_name(raw_name)
                norm_to_facts.setdefault(norm_name, []).append(f)

        if len(norm_to_facts) > 1:
            cid = f"CONFLICT-{conflict_counter:03d}"
            conflict_counter += 1

            fact_ids = [f.get("fact_id", "") for f in identity_facts]
            evidence_list = [self._build_evidence_dict(f) for f in identity_facts]
            names_summary = ", ".join([f"'{f.get('source_document')}': {f.get('detected_value')}" for f in identity_facts])
            reason = f"Bidder identity differs between submitted documents: {names_summary}."

            conflicts.append(ConflictItem(
                conflict_id=cid,
                category="IDENTITY",
                field="company_name",
                severity=RiskLevel.HIGH.value,
                facts=fact_ids,
                evidence=evidence_list,
                reason=reason,
                requires_manual_review=True,
            ))

            rid = f"RISK-{risk_counter:03d}"
            risk_counter += 1

            risk_items.append(RiskItem(
                risk_id=rid,
                risk_type=RiskType.IDENTITY_MISMATCH.value,
                severity=RiskLevel.HIGH.value,
                score_contribution=30,
                fact_ids=fact_ids,
                conflict_id=cid,
                reason=reason,
                evidence=evidence_list,
                recommended_action="Perform manual identity verification across submitted company dossier documents.",
                requires_manual_review=True,
            ))

        return conflicts, risk_items, conflict_counter, risk_counter

    def _evaluate_compliance_risks(
        self,
        compliance_results: List[Dict[str, Any]],
        risk_counter: int
    ) -> Tuple[List[RiskItem], int]:
        """
        Evaluates risk triggers arising from Phase 4 compliance decisions.
        """
        risk_items: List[RiskItem] = []

        missing_mandatory_count = 0
        for comp in compliance_results:
            req_id = comp.get("requirement_id", "")
            status = str(comp.get("status", "")).upper()
            mandatory = comp.get("mandatory", True)
            fact_ids = comp.get("fact_ids", [])
            evidence = comp.get("evidence", [])

            if status == "MISSING" and mandatory:
                missing_mandatory_count += 1
                rid = f"RISK-{risk_counter:03d}"
                risk_counter += 1

                risk_items.append(RiskItem(
                    risk_id=rid,
                    risk_type=RiskType.MANDATORY_EVIDENCE_MISSING.value,
                    severity=RiskLevel.HIGH.value,
                    score_contribution=20,
                    requirement_id=req_id,
                    fact_ids=fact_ids,
                    reason=f"Mandatory requirement evidence for '{req_id}' was not found in submitted bidder documents.",
                    evidence=evidence,
                    recommended_action="Request missing document from bidder or confirm omission.",
                    requires_manual_review=True,
                ))
            elif status == "FAIL" and mandatory:
                rid = f"RISK-{risk_counter:03d}"
                risk_counter += 1

                risk_items.append(RiskItem(
                    risk_id=rid,
                    risk_type=RiskType.MANDATORY_REQUIREMENT_FAILED.value,
                    severity=RiskLevel.HIGH.value,
                    score_contribution=25,
                    requirement_id=req_id,
                    fact_ids=fact_ids,
                    reason=f"The bidder failed mandatory requirement '{req_id}': {comp.get('reason')}",
                    evidence=evidence,
                    recommended_action="Review non-compliant item and determine if bid is disqualified.",
                    requires_manual_review=True,
                ))
            elif status == "REVIEW":
                rid = f"RISK-{risk_counter:03d}"
                risk_counter += 1

                risk_items.append(RiskItem(
                    risk_id=rid,
                    risk_type=RiskType.AMBIGUOUS_EVIDENCE.value,
                    severity=RiskLevel.MEDIUM.value,
                    score_contribution=10,
                    requirement_id=req_id,
                    fact_ids=fact_ids,
                    reason=f"Requirement '{req_id}' contains unquantified statement or requires human interpretation.",
                    evidence=evidence,
                    recommended_action="Manually evaluate unquantified statement against tender criteria.",
                    requires_manual_review=True,
                ))

        return risk_items, risk_counter

    def _evaluate_certificate_risks(
        self,
        facts: List[Dict[str, Any]],
        risk_counter: int
    ) -> Tuple[List[RiskItem], int]:
        """
        Evaluates expired certificates and certificates expiring within 30 days.
        """
        risk_items: List[RiskItem] = []

        for f in facts:
            cat = str(f.get("category", "")).upper()
            period_str = str(f.get("period") or "").lower()
            fact_id = f.get("fact_id", "")
            evidence_list = [self._build_evidence_dict(f)]

            if cat == "CERTIFICATION" or "valid" in period_str or "expire" in period_str:
                year_match = re.search(r"\b(20\d{2})\b", period_str)
                if year_match:
                    year = int(year_match.group(1))
                    # Expired certificate check
                    if year < self.evaluation_date.year:
                        rid = f"RISK-{risk_counter:03d}"
                        risk_counter += 1
                        risk_items.append(RiskItem(
                            risk_id=rid,
                            risk_type=RiskType.EXPIRED_CERTIFICATE.value,
                            severity=RiskLevel.HIGH.value,
                            score_contribution=25,
                            fact_ids=[fact_id],
                            reason=f"The submitted certificate '{f.get('detected_value')}' expired in {year}.",
                            evidence=evidence_list,
                            recommended_action="Request active certificate renewal copy from bidder or issuing authority.",
                            requires_manual_review=True,
                        ))
                    # Near-expiry certificate check (current year)
                    elif year == self.evaluation_date.year:
                        rid = f"RISK-{risk_counter:03d}"
                        risk_counter += 1
                        risk_items.append(RiskItem(
                            risk_id=rid,
                            risk_type=RiskType.NEAR_EXPIRY_CERTIFICATE.value,
                            severity=RiskLevel.MEDIUM.value,
                            score_contribution=15,
                            fact_ids=[fact_id],
                            reason=f"The submitted certificate '{f.get('detected_value')}' expires within the current evaluation period ({year}).",
                            evidence=evidence_list,
                            recommended_action="Verify certificate validity and request extension commitment.",
                            requires_manual_review=True,
                        ))

        return risk_items, risk_counter

    def _evaluate_confidence_risks(
        self,
        facts: List[Dict[str, Any]],
        risk_counter: int
    ) -> Tuple[List[RiskItem], int]:
        """
        Flags facts with low AI confidence (< 0.60).
        """
        risk_items: List[RiskItem] = []

        for f in facts:
            conf = f.get("confidence")
            if conf is not None and conf < 0.60:
                rid = f"RISK-{risk_counter:03d}"
                risk_counter += 1
                fact_id = f.get("fact_id", "")
                evidence_list = [self._build_evidence_dict(f)]

                risk_items.append(RiskItem(
                    risk_id=rid,
                    risk_type=RiskType.LOW_CONFIDENCE_EVIDENCE.value,
                    severity=RiskLevel.MEDIUM.value,
                    score_contribution=15,
                    fact_ids=[fact_id],
                    reason=f"Fact '{fact_id}' was extracted with low AI confidence ({conf:.2f}).",
                    evidence=evidence_list,
                    recommended_action="Manually inspect original scanned page snippet.",
                    requires_manual_review=True,
                ))

        return risk_items, risk_counter

    def _calculate_risk_score_and_priority(
        self,
        risk_items: List[RiskItem],
        conflicts: List[ConflictItem]
    ) -> OverallRiskAssessment:
        """
        Calculates transparent risk score (0-100), risk level, and review priority deterministically.
        """
        scoring_factors: List[RiskFactorItem] = []
        raw_score = 0

        for r in risk_items:
            raw_score += r.score_contribution
            scoring_factors.append(RiskFactorItem(
                factor_name=r.risk_type,
                score_contribution=r.score_contribution,
                reason=r.reason
            ))

        total_risk_score = min(100, raw_score)

        # Risk Level thresholds
        if total_risk_score >= 81:
            risk_level = RiskLevel.CRITICAL.value
        elif total_risk_score >= 61:
            risk_level = RiskLevel.HIGH.value
        elif total_risk_score >= 31:
            risk_level = RiskLevel.MEDIUM.value
        else:
            risk_level = RiskLevel.LOW.value

        # Review Priority
        if total_risk_score >= 61 or len(conflicts) > 0 or any(r.severity == RiskLevel.HIGH.value for r in risk_items):
            review_priority = "HIGH"
        elif total_risk_score >= 31 or len(risk_items) > 0:
            review_priority = "MEDIUM"
        else:
            review_priority = "LOW"

        manual_review_required = total_risk_score > 0 or len(conflicts) > 0 or any(r.requires_manual_review for r in risk_items)

        summary_reason = (
            f"Overall risk evaluated as {risk_level} (Score: {total_risk_score}/100, Priority: {review_priority}). "
            f"Identified {len(risk_items)} risk factors and {len(conflicts)} data conflicts."
        )

        return OverallRiskAssessment(
            overall_risk_level=risk_level,
            risk_score=total_risk_score,
            review_priority=review_priority,
            manual_review_required=manual_review_required,
            scoring_factors=scoring_factors,
            risk_items=risk_items,
            conflicts=conflicts,
            summary_reason=summary_reason,
        )

    # -------------------------------------------------------------------------
    # UTILITY FUNCTIONS
    # -------------------------------------------------------------------------

    def _normalize_company_name(self, name: str) -> str:
        """
        Normalizes company names by stripping legal suffixes and non-alphanumeric chars.

        Example:
            "ABC Technologies Private Limited" -> "ABCTECHNOLOGIES"
            "ABC Technologies Pvt Ltd"        -> "ABCTECHNOLOGIES"
        """
        upper = name.upper()
        # Strip common legal entity suffixes
        legal_terms = [
            "PRIVATE LIMITED", "PVT LTD", "PVT. LTD.", "PRIVATE LTD",
            "LIMITED", "LTD.", "LTD", "INC.", "INC", "LLP", "CORP", "CORPORATION"
        ]
        for term in legal_terms:
            upper = upper.replace(term, "")
        return re.sub(r"[^A-Z0-9]", "", upper)

    def _build_evidence_dict(self, fact: Dict[str, Any]) -> Dict[str, Any]:
        """Constructs evidence dictionary from Phase 3 fact."""
        return {
            "fact_id": str(fact.get("fact_id", "")),
            "source_document": str(fact.get("source_document", "")),
            "page_number": fact.get("page_number", 1),
            "source_text": str(fact.get("source_text", "")),
            "section_name": fact.get("section_name"),
        }

    def _extract_fact_list(self, fact_input: Any) -> List[Dict[str, Any]]:
        """Extracts fact list from Phase 3 JSON output or dict list."""
        if isinstance(fact_input, dict):
            return fact_input.get("facts", [])
        elif isinstance(fact_input, list):
            return fact_input
        return []

    def _extract_compliance_data(self, comp_input: Any) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """Extracts compliance result list and summary metadata."""
        if isinstance(comp_input, dict):
            return comp_input.get("results", []), comp_input
        elif isinstance(comp_input, list):
            return comp_input, {}
        return [], {}
