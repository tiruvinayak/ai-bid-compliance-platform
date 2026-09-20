"""
===============================================================================
MODULE: test_compliance_engine.py
===============================================================================
PURPOSE:
    Automated unit and integration test suite for Phase 4 (Compliance Verification Engine).

TEST CASES COVERED:
    TEST 1: Financial turnover PASS (Detected 7 Cr >= Required 5 Cr)
    TEST 2: Financial turnover FAIL (Detected 3 Cr < Required 5 Cr)
    TEST 3: ISO Certification PASS (ISO 9001:2015 normalized text match)
    TEST 4: Certification Mismatch FAIL (ISO 14001 vs ISO 9001:2015)
    TEST 5: Missing Evidence (0 matching facts -> status="MISSING")
    TEST 6: Ambiguous Experience Requirement (unquantified -> status="REVIEW")
    TEST 7: Conflicting Facts (Doc 1: 7 Cr, Doc 2: 4 Cr -> status="CONFLICT")
    TEST 8: Certificate Expiry Future (Valid until 2027-03-31 -> status="PASS")
    TEST 9: Certificate Expired (Expired in 2020 -> status="FAIL")
    TEST 10: Unit Normalization / Equivalent string numbers (50,000,000 == 50000000 -> status="PASS")
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

# Phase 4 import
from app.compliance_engine import ComplianceEngine


class TestComplianceEngine(unittest.TestCase):
    """
    Unit test suite validating Phase 4 Compliance Verification Engine.
    """

    def setUp(self):
        """Instantiates ComplianceEngine with fixed reference date (2026-08-29)."""
        self.engine = ComplianceEngine(default_evaluation_date=datetime.date(2026, 8, 29))

    def test_01_financial_turnover_pass(self):
        """
        TEST 1: Required ₹5 Crore (50000000), Detected ₹7 Crore (70000000).
        EXPECTED: status="PASS", rule_used="MINIMUM_VALUE_COMPARISON"
        """
        reqs = [{
            "requirement_id": "REQ-001",
            "category": "FINANCIAL",
            "description": "Minimum average annual turnover",
            "required_value": 50000000,
            "unit": "INR",
            "period": "last 3 fiscal years",
            "mandatory": True,
            "ambiguous": False
        }]
        facts = [{
            "fact_id": "FACT-002",
            "category": "FINANCIAL",
            "field": "annual_turnover",
            "detected_value": 70000000,
            "unit": "INR",
            "period": "last 3 fiscal years",
            "confidence": 0.95,
            "ambiguous": False,
            "source_document": "bidder_financial.pdf",
            "page_number": 1,
            "source_text": "ABC Technologies had an average annual turnover of INR 7 Crore over the last 3 fiscal years."
        }]

        result = self.engine.evaluate_bid_compliance(reqs, facts)
        self.assertEqual(result["passed"], 1)
        res = result["results"][0]
        self.assertEqual(res["status"], "PASS")
        self.assertEqual(res["rule_used"], "MINIMUM_VALUE_COMPARISON")
        self.assertIn("70,000,000", res["reason"])
        self.assertIn("50,000,000", res["reason"])

    def test_02_financial_turnover_fail(self):
        """
        TEST 2: Required ₹5 Crore (50000000), Detected ₹3 Crore (30000000).
        EXPECTED: status="FAIL"
        """
        reqs = [{
            "requirement_id": "REQ-001",
            "category": "FINANCIAL",
            "description": "Minimum average annual turnover",
            "required_value": 50000000,
            "unit": "INR",
            "mandatory": True
        }]
        facts = [{
            "fact_id": "FACT-002",
            "category": "FINANCIAL",
            "field": "annual_turnover",
            "detected_value": 30000000,
            "unit": "INR",
            "source_document": "bidder_financial.pdf",
            "page_number": 1,
            "source_text": "Turnover was INR 3 Crore."
        }]

        result = self.engine.evaluate_bid_compliance(reqs, facts)
        self.assertEqual(result["failed"], 1)
        res = result["results"][0]
        self.assertEqual(res["status"], "FAIL")
        self.assertIn("below the required minimum", res["reason"])

    def test_03_certification_pass(self):
        """
        TEST 3: Required ISO 9001:2015, Detected ISO-9001-2015.
        EXPECTED: status="PASS", rule_used="CERTIFICATION_MATCH"
        """
        reqs = [{
            "requirement_id": "REQ-002",
            "category": "CERTIFICATION",
            "description": "ISO 9001:2015 Quality Management certification",
            "required_value": "ISO 9001:2015",
            "mandatory": True
        }]
        facts = [{
            "fact_id": "FACT-003",
            "category": "CERTIFICATION",
            "field": "iso_certification",
            "detected_value": "ISO-9001-2015",
            "period": "Valid until 31 March 2027",
            "source_document": "bidder_cert.pdf",
            "page_number": 1,
            "source_text": "ISO-9001-2015 certified."
        }]

        result = self.engine.evaluate_bid_compliance(reqs, facts)
        self.assertEqual(result["passed"], 1)
        res = result["results"][0]
        self.assertEqual(res["status"], "PASS")
        self.assertEqual(res["rule_used"], "CERTIFICATION_MATCH")

    def test_04_certification_fail_mismatch(self):
        """
        TEST 4: Required ISO 9001:2015, Detected ISO 14001.
        EXPECTED: status="FAIL"
        """
        reqs = [{
            "requirement_id": "REQ-002",
            "category": "CERTIFICATION",
            "description": "ISO 9001:2015 certification",
            "required_value": "ISO 9001:2015",
            "mandatory": True
        }]
        facts = [{
            "fact_id": "FACT-003",
            "category": "CERTIFICATION",
            "field": "iso_certification",
            "detected_value": "ISO 14001",
            "source_document": "bidder_cert.pdf",
            "page_number": 1,
            "source_text": "ISO 14001 Environmental certification."
        }]

        result = self.engine.evaluate_bid_compliance(reqs, facts)
        self.assertEqual(result["failed"], 1)
        res = result["results"][0]
        self.assertEqual(res["status"], "FAIL")
        self.assertIn("ISO 14001", res["reason"])

    def test_05_missing_evidence(self):
        """
        TEST 5: Required ISO 9001:2015, No facts submitted.
        EXPECTED: status="MISSING", rule_used="MISSING_EVIDENCE_RULE"
        """
        reqs = [{
            "requirement_id": "REQ-002",
            "category": "CERTIFICATION",
            "description": "ISO 9001:2015 Quality Management certification",
            "required_value": "ISO 9001:2015",
            "mandatory": True
        }]
        facts = []  # No facts in bidder doc

        result = self.engine.evaluate_bid_compliance(reqs, facts)
        self.assertEqual(result["missing"], 1)
        res = result["results"][0]
        self.assertEqual(res["status"], "MISSING")
        self.assertEqual(res["rule_used"], "MISSING_EVIDENCE_RULE")
        self.assertIn("No evidence", res["reason"])

    def test_06_ambiguous_experience_review(self):
        """
        TEST 6: Ambiguous experience requirement ("adequate experience").
        EXPECTED: status="REVIEW", requires_manual_review=True
        """
        reqs = [{
            "requirement_id": "REQ-003",
            "category": "EXPERIENCE",
            "description": "Bidder must have adequate experience",
            "required_value": None,
            "ambiguous": True,
            "mandatory": True
        }]
        facts = [{
            "fact_id": "FACT-005",
            "category": "EXPERIENCE",
            "field": "years_in_business",
            "detected_value": None,
            "ambiguous": True,
            "source_document": "profile.pdf",
            "page_number": 1,
            "source_text": "Significant experience in government technology projects."
        }]

        result = self.engine.evaluate_bid_compliance(reqs, facts)
        self.assertEqual(result["review"], 1)
        res = result["results"][0]
        self.assertEqual(res["status"], "REVIEW")
        self.assertTrue(res["requires_manual_review"])

    def test_07_conflicting_facts(self):
        """
        TEST 7: Document 1 says ₹7 Crore, Document 2 says ₹4 Crore.
        EXPECTED: status="CONFLICT", rule_used="CONFLICT_DETECTION_RULE"
        """
        reqs = [{
            "requirement_id": "REQ-001",
            "category": "FINANCIAL",
            "description": "Minimum turnover INR 5 Crore",
            "required_value": 50000000,
            "unit": "INR",
            "mandatory": True
        }]
        facts = [
            {
                "fact_id": "FACT-001",
                "category": "FINANCIAL",
                "field": "annual_turnover",
                "detected_value": 70000000,
                "unit": "INR",
                "source_document": "audited_report.pdf",
                "page_number": 1,
                "source_text": "Turnover was INR 7 Crore."
            },
            {
                "fact_id": "FACT-008",
                "category": "FINANCIAL",
                "field": "annual_turnover",
                "detected_value": 40000000,
                "unit": "INR",
                "source_document": "summary_sheet.pdf",
                "page_number": 2,
                "source_text": "Annual Turnover: INR 4 Crore."
            }
        ]

        result = self.engine.evaluate_bid_compliance(reqs, facts)
        self.assertEqual(result["conflicts"], 1)
        res = result["results"][0]
        self.assertEqual(res["status"], "CONFLICT")
        self.assertEqual(res["rule_used"], "CONFLICT_DETECTION_RULE")

    def test_08_certificate_expiry_future(self):
        """
        TEST 8: Certificate valid until 31 March 2027 (Future date relative to 2026-08-29).
        EXPECTED: status="PASS"
        """
        reqs = [{
            "requirement_id": "REQ-002",
            "category": "CERTIFICATION",
            "description": "ISO 9001:2015 certification",
            "required_value": "ISO 9001:2015",
            "mandatory": True
        }]
        facts = [{
            "fact_id": "FACT-003",
            "category": "CERTIFICATION",
            "field": "iso_certification",
            "detected_value": "ISO 9001:2015",
            "period": "Valid until 31 March 2027",
            "source_document": "cert.pdf",
            "page_number": 1,
            "source_text": "Valid until 31 March 2027."
        }]

        result = self.engine.evaluate_bid_compliance(reqs, facts)
        self.assertEqual(result["passed"], 1)

    def test_09_certificate_expired(self):
        """
        TEST 9: Certificate expired in 2020 (Past date relative to 2026-08-29).
        EXPECTED: status="FAIL", rule_used="EXPIRED_CERTIFICATE_RULE"
        """
        reqs = [{
            "requirement_id": "REQ-002",
            "category": "CERTIFICATION",
            "description": "ISO 9001:2015 certification",
            "required_value": "ISO 9001:2015",
            "mandatory": True
        }]
        facts = [{
            "fact_id": "FACT-003",
            "category": "CERTIFICATION",
            "field": "iso_certification",
            "detected_value": "ISO 9001:2015",
            "period": "Valid until 31 December 2020",
            "source_document": "cert.pdf",
            "page_number": 1,
            "source_text": "Expired on 31 December 2020."
        }]

        result = self.engine.evaluate_bid_compliance(reqs, facts)
        self.assertEqual(result["failed"], 1)
        res = result["results"][0]
        self.assertEqual(res["status"], "FAIL")
        self.assertEqual(res["rule_used"], "EXPIRED_CERTIFICATE_RULE")
        self.assertIn("expired", res["reason"].lower())

    def test_10_numeric_unit_normalization(self):
        """
        TEST 10: Required 50000000, Detected string "50,000,000".
        EXPECTED: status="PASS"
        """
        reqs = [{
            "requirement_id": "REQ-001",
            "category": "FINANCIAL",
            "description": "Minimum annual turnover",
            "required_value": 50000000,
            "unit": "INR",
            "mandatory": True
        }]
        facts = [{
            "fact_id": "FACT-002",
            "category": "FINANCIAL",
            "field": "annual_turnover",
            "detected_value": "50,000,000",
            "unit": "INR",
            "source_document": "financial.pdf",
            "page_number": 1,
            "source_text": "Turnover: 50,000,000 INR"
        }]

        result = self.engine.evaluate_bid_compliance(reqs, facts)
        self.assertEqual(result["passed"], 1)
        self.assertEqual(result["results"][0]["status"], "PASS")


if __name__ == "__main__":
    unittest.main()
