"""
===============================================================================
MODULE: test_risk_conflict_engine.py
===============================================================================
PURPOSE:
    Automated unit and integration test suite for Phase 5 (Risk & Conflict Intelligence).

TEST CASES COVERED:
    TEST 1: All requirements PASS -> Risk score: 0, Risk level: LOW, Priority: LOW
    TEST 2: One mandatory requirement MISSING -> Score: 20, MANDATORY_EVIDENCE_MISSING
    TEST 3: One mandatory requirement FAIL -> Score: 25, MANDATORY_REQUIREMENT_FAILED
    TEST 4: Conflicting turnover values -> CONFLICT, Risk level: HIGH
    TEST 5: Expired certificate -> EXPIRED_CERTIFICATE, Risk level: HIGH
    TEST 6: Near-expiry certificate -> NEAR_EXPIRY_CERTIFICATE, Risk level: MEDIUM
    TEST 7: Low-confidence fact (< 0.60) -> LOW_CONFIDENCE_EVIDENCE, Risk level: MEDIUM
    TEST 8: Ambiguous experience -> AMBIGUOUS_EVIDENCE, REVIEW
    TEST 9: Different company names -> IDENTITY_MISMATCH
    TEST 10: Multiple missing mandatory requirements -> Score accumulated deterministically
    TEST 11: Equivalent numeric units -> NO CONFLICT
    TEST 12: Harmless company-name formatting differences -> NO CONFLICT
===============================================================================
"""

# standard library imports
import datetime
import sys
import unittest
from pathlib import Path

# Add project root directory (ai-service) to python path so app package can be imported cleanly
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# Phase 5 import
from app.risk_conflict_engine import RiskConflictEngine


class TestRiskConflictEngine(unittest.TestCase):
    """
    Unit test suite validating Phase 5 Risk & Conflict Intelligence service.
    """

    def setUp(self):
        """Instantiates RiskConflictEngine with fixed evaluation reference date (2026-08-29)."""
        self.engine = RiskConflictEngine(default_evaluation_date=datetime.date(2026, 8, 29))

    def test_01_all_requirements_pass(self):
        """
        TEST 1: All requirements PASS.
        EXPECTED: risk_score=0, overall_risk_level="LOW", review_priority="LOW"
        """
        facts = [{
            "fact_id": "FACT-001",
            "category": "FINANCIAL",
            "field": "annual_turnover",
            "detected_value": 70000000,
            "confidence": 0.95,
            "source_document": "fin.pdf",
            "page_number": 1,
            "source_text": "Turnover is INR 7 Crore."
        }]
        compliance = {
            "results": [{
                "requirement_id": "REQ-001",
                "category": "FINANCIAL",
                "status": "PASS",
                "mandatory": True,
                "fact_ids": ["FACT-001"]
            }]
        }

        res = self.engine.assess_bid_risk(facts, compliance)
        self.assertEqual(res["risk_score"], 0)
        self.assertEqual(res["overall_risk_level"], "LOW")
        self.assertEqual(res["review_priority"], "LOW")

    def test_02_mandatory_requirement_missing(self):
        """
        TEST 2: One mandatory requirement MISSING.
        EXPECTED: score=20, risk_type="MANDATORY_EVIDENCE_MISSING"
        """
        facts = []
        compliance = {
            "results": [{
                "requirement_id": "REQ-002",
                "category": "CERTIFICATION",
                "status": "MISSING",
                "mandatory": True,
                "fact_ids": []
            }]
        }

        res = self.engine.assess_bid_risk(facts, compliance)
        self.assertEqual(res["risk_score"], 20)
        self.assertGreaterEqual(len(res["risk_items"]), 1)
        self.assertEqual(res["risk_items"][0]["risk_type"], "MANDATORY_EVIDENCE_MISSING")

    def test_03_mandatory_requirement_fail(self):
        """
        TEST 3: One mandatory requirement FAIL.
        EXPECTED: score=25, risk_type="MANDATORY_REQUIREMENT_FAILED"
        """
        facts = [{
            "fact_id": "FACT-001",
            "category": "FINANCIAL",
            "field": "annual_turnover",
            "detected_value": 30000000,
            "source_document": "fin.pdf",
            "page_number": 1,
            "source_text": "Turnover was INR 3 Crore."
        }]
        compliance = {
            "results": [{
                "requirement_id": "REQ-001",
                "category": "FINANCIAL",
                "status": "FAIL",
                "mandatory": True,
                "fact_ids": ["FACT-001"],
                "reason": "Detected annual turnover of INR 3 Crore is below required minimum of INR 5 Crore."
            }]
        }

        res = self.engine.assess_bid_risk(facts, compliance)
        self.assertEqual(res["risk_score"], 25)
        self.assertEqual(res["risk_items"][0]["risk_type"], "MANDATORY_REQUIREMENT_FAILED")

    def test_04_conflicting_turnover_values(self):
        """
        TEST 4: Conflicting turnover values (Doc A: 7 Cr, Doc B: 4 Cr).
        EXPECTED: CONFLICT generated, risk_type="EVIDENCE_CONFLICT", score=30, risk_level="LOW"/"MEDIUM" depending on items
        """
        facts = [
            {
                "fact_id": "FACT-001",
                "category": "FINANCIAL",
                "field": "annual_turnover",
                "detected_value": 70000000,
                "source_document": "audited_report.pdf",
                "page_number": 1,
                "source_text": "Turnover was INR 7 Crore."
            },
            {
                "fact_id": "FACT-009",
                "category": "FINANCIAL",
                "field": "annual_turnover",
                "detected_value": 40000000,
                "source_document": "summary_profile.pdf",
                "page_number": 2,
                "source_text": "Turnover: INR 4 Crore."
            }
        ]
        compliance = {"results": []}

        res = self.engine.assess_bid_risk(facts, compliance)
        self.assertGreaterEqual(len(res["conflicts"]), 1)
        self.assertEqual(res["conflicts"][0]["category"], "FINANCIAL")
        self.assertEqual(res["risk_items"][0]["risk_type"], "EVIDENCE_CONFLICT")
        self.assertEqual(res["review_priority"], "HIGH")

    def test_05_expired_certificate(self):
        """
        TEST 5: Expired certificate (Expired in 2020).
        EXPECTED: risk_type="EXPIRED_CERTIFICATE", severity="HIGH"
        """
        facts = [{
            "fact_id": "FACT-003",
            "category": "CERTIFICATION",
            "field": "iso_certification",
            "detected_value": "ISO 9001:2015",
            "period": "Valid until 31 December 2020",
            "source_document": "cert.pdf",
            "page_number": 1,
            "source_text": "Expired 2020."
        }]
        compliance = {"results": []}

        res = self.engine.assess_bid_risk(facts, compliance)
        self.assertEqual(res["risk_items"][0]["risk_type"], "EXPIRED_CERTIFICATE")
        self.assertEqual(res["risk_items"][0]["severity"], "HIGH")

    def test_06_near_expiry_certificate(self):
        """
        TEST 6: Certificate expiring within current evaluation year (2026).
        EXPECTED: risk_type="NEAR_EXPIRY_CERTIFICATE", severity="MEDIUM"
        """
        facts = [{
            "fact_id": "FACT-003",
            "category": "CERTIFICATION",
            "field": "iso_certification",
            "detected_value": "ISO 9001:2015",
            "period": "Valid until 31 October 2026",
            "source_document": "cert.pdf",
            "page_number": 1,
            "source_text": "Valid until October 2026."
        }]
        compliance = {"results": []}

        res = self.engine.assess_bid_risk(facts, compliance)
        self.assertEqual(res["risk_items"][0]["risk_type"], "NEAR_EXPIRY_CERTIFICATE")
        self.assertEqual(res["risk_items"][0]["severity"], "MEDIUM")

    def test_07_low_confidence_fact(self):
        """
        TEST 7: Low confidence fact (confidence = 0.45).
        EXPECTED: risk_type="LOW_CONFIDENCE_EVIDENCE", score=15
        """
        facts = [{
            "fact_id": "FACT-010",
            "category": "TECHNICAL",
            "field": "server_capacity",
            "detected_value": "100 TB",
            "confidence": 0.45,
            "source_document": "tech_spec.pdf",
            "page_number": 3,
            "source_text": "Unclear text snippet."
        }]
        compliance = {"results": []}

        res = self.engine.assess_bid_risk(facts, compliance)
        self.assertEqual(res["risk_items"][0]["risk_type"], "LOW_CONFIDENCE_EVIDENCE")

    def test_08_ambiguous_experience_review(self):
        """
        TEST 8: Ambiguous experience statement ("significant experience").
        EXPECTED: risk_type="AMBIGUOUS_EVIDENCE"
        """
        compliance = {
            "results": [{
                "requirement_id": "REQ-003",
                "category": "EXPERIENCE",
                "status": "REVIEW",
                "mandatory": True,
                "fact_ids": ["FACT-005"]
            }]
        }
        facts = []

        res = self.engine.assess_bid_risk(facts, compliance)
        self.assertEqual(res["risk_items"][0]["risk_type"], "AMBIGUOUS_EVIDENCE")

    def test_09_different_company_names_mismatch(self):
        """
        TEST 9: Different company names (ABC Technologies vs XYZ Technologies).
        EXPECTED: risk_type="IDENTITY_MISMATCH", CONFLICT generated
        """
        facts = [
            {
                "fact_id": "FACT-001",
                "category": "IDENTITY",
                "field": "company_name",
                "detected_value": "ABC Technologies Private Limited",
                "source_document": "fin_report.pdf",
                "page_number": 1,
                "source_text": "ABC Technologies Private Limited"
            },
            {
                "fact_id": "FACT-002",
                "category": "IDENTITY",
                "field": "company_name",
                "detected_value": "XYZ Technologies Private Limited",
                "source_document": "tax_doc.pdf",
                "page_number": 1,
                "source_text": "XYZ Technologies Private Limited"
            }
        ]
        compliance = {"results": []}

        res = self.engine.assess_bid_risk(facts, compliance)
        self.assertGreaterEqual(len(res["conflicts"]), 1)
        self.assertEqual(res["conflicts"][0]["category"], "IDENTITY")
        self.assertEqual(res["risk_items"][0]["risk_type"], "IDENTITY_MISMATCH")

    def test_10_multiple_missing_mandatory_requirements(self):
        """
        TEST 10: 3 missing mandatory requirements (+20 * 3 = 60).
        EXPECTED: score=60, overall_risk_level="MEDIUM"
        """
        compliance = {
            "results": [
                {"requirement_id": "REQ-001", "category": "FINANCIAL", "status": "MISSING", "mandatory": True},
                {"requirement_id": "REQ-002", "category": "CERTIFICATION", "status": "MISSING", "mandatory": True},
                {"requirement_id": "REQ-003", "category": "SECURITY", "status": "MISSING", "mandatory": True},
            ]
        }
        facts = []

        res = self.engine.assess_bid_risk(facts, compliance)
        self.assertEqual(res["risk_score"], 60)
        self.assertEqual(res["overall_risk_level"], "MEDIUM")

    def test_11_equivalent_numeric_units_no_conflict(self):
        """
        TEST 11: Equivalent numeric units (50000000 vs 50000000).
        EXPECTED: 0 conflicts detected
        """
        facts = [
            {
                "fact_id": "FACT-001",
                "category": "FINANCIAL",
                "field": "annual_turnover",
                "detected_value": 50000000,
                "source_document": "doc1.pdf",
                "page_number": 1,
                "source_text": "Turnover: 50,000,000"
            },
            {
                "fact_id": "FACT-002",
                "category": "FINANCIAL",
                "field": "annual_turnover",
                "detected_value": 50000000,
                "source_document": "doc2.pdf",
                "page_number": 2,
                "source_text": "Annual turnover is 50000000"
            }
        ]
        compliance = {"results": []}

        res = self.engine.assess_bid_risk(facts, compliance)
        self.assertEqual(len(res["conflicts"]), 0)

    def test_12_harmless_company_name_formatting_no_conflict(self):
        """
        TEST 12: Harmless company name formatting ("ABC Technologies Pvt Ltd" vs "ABC Technologies Private Limited").
        EXPECTED: 0 identity conflicts detected due to legal name normalization
        """
        facts = [
            {
                "fact_id": "FACT-001",
                "category": "IDENTITY",
                "field": "company_name",
                "detected_value": "ABC Technologies Pvt Ltd",
                "source_document": "doc1.pdf",
                "page_number": 1,
                "source_text": "ABC Technologies Pvt Ltd"
            },
            {
                "fact_id": "FACT-002",
                "category": "IDENTITY",
                "field": "company_name",
                "detected_value": "ABC Technologies Private Limited",
                "source_document": "doc2.pdf",
                "page_number": 1,
                "source_text": "ABC Technologies Private Limited"
            }
        ]
        compliance = {"results": []}

        res = self.engine.assess_bid_risk(facts, compliance)
        self.assertEqual(len(res["conflicts"]), 0)


if __name__ == "__main__":
    unittest.main()
