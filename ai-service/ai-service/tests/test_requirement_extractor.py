"""
===============================================================================
MODULE: test_requirement_extractor.py
===============================================================================
PURPOSE:
    Automated unit and integration test suite for Phase 2 AI Requirement Extractor.

TEST CASES COVERED:
    TEST 1: Financial turnover extraction ("INR 5 Crore" -> 50000000, INR, FINANCIAL, mandatory=True)
    TEST 2: Certification extraction ("ISO 9001:2015" -> CERTIFICATION, mandatory=True)
    TEST 3: Ambiguous experience extraction ("adequate experience" -> ambiguous=True, required_value=None, status="REVIEW")
    TEST 4: Registration extraction ("GST registration" -> REGISTRATION, GST, mandatory=True)
    TEST 5: Empty document / no requirement text -> Empty requirement list
    TEST 6: Malformed LLM output handling (invalid JSON handled safely without crashing)
    TEST 7: Integration test on Phase 1 output (sample_tender.pdf)
===============================================================================
"""

# standard library imports
import sys
import unittest
from pathlib import Path

# Add project root directory (ai-service) to python path so app package can be imported cleanly
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# Phase 2 imports
from app.requirement_extractor import RequirementExtractor
from app.llm_client import MockLLMProvider, BaseLLMProvider


class BrokenLLMProvider(BaseLLMProvider):
    """
    Mock provider that returns broken/invalid JSON to test error resilience.
    """

    def generate_json(self, prompt: str, system_prompt: str) -> str:
        return "THIS IS INVALID NON-JSON TEXT { {{ malformed... }}}"


class ExceptionLLMProvider(BaseLLMProvider):
    """
    Mock provider that raises a network error/timeout to test error resilience.
    """

    def generate_json(self, prompt: str, system_prompt: str) -> str:
        raise RuntimeError("Network Timeout: Connection lost to LLM endpoint")


class TestRequirementExtractor(unittest.TestCase):
    """
    Unit test suite validating Phase 2 Requirement Extractor service.
    """

    def setUp(self):
        """
        Runs before each test case to instantiate a clean RequirementExtractor with MockLLMProvider.
        """
        self.mock_provider = MockLLMProvider()
        self.extractor = RequirementExtractor(llm_provider=self.mock_provider)

    def test_01_financial_turnover_requirement(self):
        """
        TEST 1: "Average annual turnover must be at least INR 5 Crore over the last 3 fiscal years."
        EXPECTED: category=FINANCIAL, required_value=50000000, unit=INR, mandatory=True
        """
        text = "The bidder must have an average annual turnover of at least INR 5 Crore over the last 3 fiscal years."
        result = self.extractor.extract_from_raw_text(text)

        self.assertTrue(result["success"])
        self.assertEqual(len(result["requirements"]), 1)

        req = result["requirements"][0]
        self.assertEqual(req["category"], "FINANCIAL")
        self.assertEqual(req["required_value"], 50000000)
        self.assertEqual(req["unit"], "INR")
        self.assertTrue(req["mandatory"])
        self.assertFalse(req["ambiguous"])
        self.assertEqual(req["status"], "REVIEW")
        self.assertEqual(req["page_number"], 1)
        self.assertIn("turnover", req["source_text"].lower())

    def test_02_iso_certification_requirement(self):
        """
        TEST 2: "The bidder must hold a valid ISO 9001:2015 Quality Management certification."
        EXPECTED: category=CERTIFICATION, required_value="ISO 9001:2015", mandatory=True
        """
        text = "The bidder must hold a valid ISO 9001:2015 Quality Management certification."
        result = self.extractor.extract_from_raw_text(text)

        self.assertTrue(result["success"])
        self.assertEqual(len(result["requirements"]), 1)

        req = result["requirements"][0]
        self.assertEqual(req["category"], "CERTIFICATION")
        self.assertEqual(req["required_value"], "ISO 9001:2015")
        self.assertTrue(req["mandatory"])
        self.assertEqual(req["status"], "REVIEW")

    def test_03_ambiguous_experience_requirement(self):
        """
        TEST 3: "Bidder must have adequate experience."
        EXPECTED: category=EXPERIENCE, ambiguous=True, required_value=None, status="REVIEW"
        """
        text = "Bidder must have adequate experience."
        result = self.extractor.extract_from_raw_text(text)

        self.assertTrue(result["success"])
        self.assertEqual(len(result["requirements"]), 1)

        req = result["requirements"][0]
        self.assertEqual(req["category"], "EXPERIENCE")
        self.assertTrue(req["ambiguous"])
        self.assertIsNone(req["required_value"])
        self.assertIsNone(req["unit"])
        self.assertEqual(req["status"], "REVIEW")

    def test_04_gst_registration_requirement(self):
        """
        TEST 4: "Bidder shall submit valid GST registration."
        EXPECTED: category=REGISTRATION, required_value="GST", mandatory=True
        """
        text = "Bidder shall submit valid GST registration."
        result = self.extractor.extract_from_raw_text(text)

        self.assertTrue(result["success"])
        self.assertEqual(len(result["requirements"]), 1)

        req = result["requirements"][0]
        self.assertEqual(req["category"], "REGISTRATION")
        self.assertEqual(req["required_value"], "GST")
        self.assertTrue(req["mandatory"])
        self.assertEqual(req["status"], "REVIEW")

    def test_05_empty_text_requirement(self):
        """
        TEST 5: No requirement text in document.
        EXPECTED: Empty requirement list [].
        """
        text = "   "
        result = self.extractor.extract_from_raw_text(text)

        self.assertTrue(result["success"])
        self.assertEqual(result["total_requirements"], 0)
        self.assertEqual(result["requirements"], [])

    def test_06_malformed_llm_json_handling(self):
        """
        TEST 6: Verify handling when LLM returns invalid/malformed JSON or raises an exception.
        EXPECTED: Returns success=True with empty/partial list without crashing.
        """
        broken_extractor = RequirementExtractor(llm_provider=BrokenLLMProvider())
        res_broken = broken_extractor.extract_from_raw_text("Some tender text")
        self.assertTrue(res_broken["success"])
        self.assertEqual(res_broken["requirements"], [])

        exception_extractor = RequirementExtractor(llm_provider=ExceptionLLMProvider())
        res_exc = exception_extractor.extract_from_raw_text("Some tender text")
        self.assertFalse(res_exc["success"])
        self.assertIn("Network Timeout", res_exc["error_message"])

    def test_07_sample_tender_integration(self):
        """
        TEST 7: Full integration test on Phase 1 output sample_tender.pdf.json.
        EXPECTED: Multiple extracted requirements covering Turnover, ISO, CERT-In, PDF format, EMD, and Bid Validity.
        """
        sample_phase1_json_path = Path("output/sample_tender.pdf.json")
        
        # If output/sample_tender.pdf.json doesn't exist yet in test environment, build mock phase 1 structure
        if sample_phase1_json_path.exists():
            result = self.extractor.extract_from_phase1_json(sample_phase1_json_path)
        else:
            mock_phase1 = {
                "success": True,
                "document_name": "sample_tender.pdf",
                "page_count": 3,
                "pages": [
                    {
                        "page_number": 1,
                        "text": "GOVERNMENT OF INDIA\n1. OVERVIEW\nDepartment invites bids for platform.",
                        "has_text": True,
                    },
                    {
                        "page_number": 2,
                        "text": "2. ELIGIBILITY CRITERIA\nThe bidder must have an average annual turnover of at least INR 5 Crore over the last 3 fiscal years.\nThe bidder must hold a valid ISO 9001:2015 Quality Management certification.\nThe bidder must submit a valid Cybersecurity Audit Certificate issued by CERT-In.",
                        "has_text": True,
                    },
                    {
                        "page_number": 3,
                        "text": "3. SUBMISSION FORMAT\nAll proposals must be uploaded in PDF format.\nEMD (Earnest Money Deposit): INR 1,00,000 to be deposited via online transfer.\nBid Validity: 180 days from the date of tender opening.",
                        "has_text": True,
                    },
                ],
            }
            result = self.extractor.extract_from_phase1_json(mock_phase1)

        self.assertTrue(result["success"])
        self.assertGreaterEqual(result["total_requirements"], 6)

        # Verify exact categories exist in extracted list
        categories = [req["category"] for req in result["requirements"]]
        self.assertIn("FINANCIAL", categories)
        self.assertIn("CERTIFICATION", categories)
        self.assertIn("SECURITY", categories)
        self.assertIn("SUBMISSION", categories)

        # Verify page number traceability preserved
        page_nums = {req["page_number"] for req in result["requirements"]}
        self.assertTrue({2, 3}.issubset(page_nums))


if __name__ == "__main__":
    unittest.main()
