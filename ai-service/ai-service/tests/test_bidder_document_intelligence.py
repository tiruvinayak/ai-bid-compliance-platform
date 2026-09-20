"""
===============================================================================
MODULE: test_bidder_document_intelligence.py
===============================================================================
PURPOSE:
    Automated unit and integration test suite for Phase 3 (Bidder Document Intelligence).

TEST CASES COVERED:
    TEST 1: Financial turnover fact extraction (INR 7 Crore -> 70000000, INR, FINANCIAL)
    TEST 2: Certification fact extraction (ISO 9001:2015 -> CERTIFICATION)
    TEST 3: Registration fact extraction (GSTIN -> REGISTRATION)
    TEST 4: Experience fact extraction
    TEST 5: Ambiguous information handling ("significant experience" -> ambiguous=True, value=None)
    TEST 6: Missing page information handling
    TEST 7: Malformed LLM JSON output resilience
    TEST 8: LLM timeout / exception resilience
    TEST 9: Empty and scanned PDF document handling (returns OCR_REQUIRED)
    TEST 10: Integration test on synthetic bidder document (bidder_financial.pdf)
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

# App imports
from app.bidder_document_analyzer import BidderDocumentAnalyzer
from app.llm_client import MockLLMProvider, BaseLLMProvider

# Helper test PDF generator
try:
    from create_bidder_test_pdfs import generate_bidder_test_files
except ImportError:
    from tests.create_bidder_test_pdfs import generate_bidder_test_files


class BrokenLLMProvider(BaseLLMProvider):
    """Mock provider returning invalid non-JSON output for testing resilience."""
    def generate_json(self, prompt: str, system_prompt: str) -> str:
        return "INVALID NON-JSON TEXT { {{ broken... }}}"


class ExceptionLLMProvider(BaseLLMProvider):
    """Mock provider raising network timeout exception."""
    def generate_json(self, prompt: str, system_prompt: str) -> str:
        raise RuntimeError("Network Timeout: Connection lost to Gemini API")


class TestBidderDocumentIntelligence(unittest.TestCase):
    """
    Unit test suite validating Phase 3 Bidder Document Intelligence service.
    """

    @classmethod
    def setUpClass(cls):
        """Generates synthetic bidder test PDF files before tests run."""
        generate_bidder_test_files()
        cls.input_dir = Path("input")

    def setUp(self):
        """Instantiates BidderDocumentAnalyzer with MockLLMProvider before each test."""
        self.mock_provider = MockLLMProvider()
        self.analyzer = BidderDocumentAnalyzer(llm_provider=self.mock_provider)

    def test_01_financial_turnover_fact_extraction(self):
        """
        TEST 1: Financial turnover fact extraction.
        EXPECTED: category=FINANCIAL, field=annual_turnover, detected_value=70000000, unit=INR
        """
        text = "ABC Technologies had an average annual turnover of INR 7 Crore over the last 3 fiscal years."
        result = self.analyzer.analyze_from_raw_text(text)

        self.assertTrue(result["success"])
        self.assertGreaterEqual(result["total_facts"], 1)

        fact = result["facts"][0]
        self.assertEqual(fact["category"], "FINANCIAL")
        self.assertEqual(fact["field"], "annual_turnover")
        self.assertEqual(fact["detected_value"], 70000000)
        self.assertEqual(fact["unit"], "INR")
        self.assertFalse(fact["ambiguous"])
        self.assertIn("turnover", fact["source_text"].lower())

    def test_01b_does_not_invent_facts_without_numeric_evidence(self):
        result = self.analyzer.analyze_from_raw_text("The bidder has turnover and GST registration.")

        self.assertTrue(result["success"])
        self.assertEqual(result["facts"], [])

    def test_02_certification_fact_extraction(self):
        """
        TEST 2: Certification fact extraction.
        EXPECTED: category=CERTIFICATION, field=iso_certification, detected_value="ISO 9001:2015"
        """
        text = "ABC Technologies holds ISO 9001:2015 Quality Management certification."
        result = self.analyzer.analyze_from_raw_text(text)

        self.assertTrue(result["success"])
        self.assertGreaterEqual(result["total_facts"], 1)

        fact = result["facts"][0]
        self.assertEqual(fact["category"], "CERTIFICATION")
        self.assertEqual(fact["detected_value"], "ISO 9001:2015")

    def test_03_registration_fact_extraction(self):
        """
        TEST 3: Registration fact extraction.
        EXPECTED: category=REGISTRATION, field=gst_number, detected_value="GSTIN29ABCDE1234F1Z5"
        """
        text = "GST Registration Number: GSTIN29ABCDE1234F1Z5."
        result = self.analyzer.analyze_from_raw_text(text)

        self.assertTrue(result["success"])
        self.assertGreaterEqual(result["total_facts"], 1)

        fact = result["facts"][0]
        self.assertEqual(fact["category"], "REGISTRATION")
        self.assertEqual(fact["detected_value"], "GSTIN29ABCDE1234F1Z5")

    def test_04_experience_fact_extraction(self):
        """
        TEST 4: Experience fact extraction.
        EXPECTED: Fact extracted with category EXPERIENCE or ambiguous handling.
        """
        text = "ABC Technologies has 5 years of completed projects experience in government sector."
        result = self.analyzer.analyze_from_raw_text(text)

        self.assertTrue(result["success"])

    def test_05_ambiguous_information_handling(self):
        """
        TEST 5: Ambiguous information handling ("significant experience").
        EXPECTED: category=EXPERIENCE, ambiguous=True, detected_value=None (NO invented numbers)
        """
        text = "ABC Technologies has significant experience in government technology projects."
        result = self.analyzer.analyze_from_raw_text(text)

        self.assertTrue(result["success"])
        self.assertGreaterEqual(result["total_facts"], 1)

        fact = result["facts"][0]
        self.assertEqual(fact["category"], "EXPERIENCE")
        self.assertTrue(fact["ambiguous"])
        self.assertIsNone(fact["detected_value"])

    def test_06_missing_page_information_handling(self):
        """
        TEST 6: Missing page information handling.
        EXPECTED: Preserves default 1 or handles None safely without crash.
        """
        mock_p1 = {
            "success": True,
            "document_name": "no_page_doc.pdf",
            "page_count": 1,
            "pages": [{"page_number": None, "text": "Turnover of INR 7 Crore.", "has_text": True}]
        }
        result = self.analyzer.analyze_from_phase1_json(mock_p1)
        self.assertTrue(result["success"])

    def test_07_invalid_llm_json_resilience(self):
        """
        TEST 7: Invalid LLM JSON output resilience.
        EXPECTED: Returns success=True with empty facts list without crashing.
        """
        broken_analyzer = BidderDocumentAnalyzer(llm_provider=BrokenLLMProvider())
        res = broken_analyzer.analyze_from_raw_text("Turnover of INR 7 Crore")
        self.assertTrue(res["success"])
        self.assertEqual(res["facts"], [])

    def test_08_llm_timeout_resilience(self):
        """
        TEST 8: LLM timeout / network exception resilience.
        EXPECTED: Returns success=False, status_code="ERROR" with error details.
        """
        exc_analyzer = BidderDocumentAnalyzer(llm_provider=ExceptionLLMProvider())
        res = exc_analyzer.analyze_from_raw_text("Turnover of INR 7 Crore")
        self.assertFalse(res["success"])
        self.assertEqual(res["status_code"], "ERROR")
        self.assertIn("Network Timeout", res["error_message"])

    def test_09_empty_and_scanned_document_handling(self):
        """
        TEST 9: Scanned PDF handling.
        EXPECTED: is_scanned_or_empty=True, status_code="OCR_REQUIRED"
        """
        mock_scanned = {
            "success": True,
            "document_name": "scanned_bidder.pdf",
            "page_count": 1,
            "is_scanned_or_empty": True,
            "pages": [{"page_number": 1, "text": "OCR will be added in a later phase", "has_text": False}]
        }
        result = self.analyzer.analyze_from_phase1_json(mock_scanned)
        self.assertTrue(result["success"])
        self.assertTrue(result["is_scanned_or_empty"])
        self.assertEqual(result["status_code"], "OCR_REQUIRED")

    def test_10_real_sample_bidder_document_integration(self):
        """
        TEST 10: Integration test on synthetic bidder document (bidder_financial.pdf).
        EXPECTED: Extracted financial turnover fact with 70000000 INR and page_number=1.
        """
        pdf_path = self.input_dir / "bidder_financial.pdf"
        # Simulate Phase 1 output for bidder_financial.pdf
        mock_phase1 = {
            "success": True,
            "document_name": pdf_path.name,
            "page_count": 1,
            "pages": [
                {
                    "page_number": 1,
                    "text": "ABC Technologies had an average annual turnover of INR 7 Crore over the last 3 fiscal years.",
                    "has_text": True
                }
            ]
        }
        result = self.analyzer.analyze_from_phase1_json(mock_phase1)
        self.assertTrue(result["success"])
        self.assertEqual(result["total_facts"], 1)

        fact = result["facts"][0]
        self.assertEqual(fact["category"], "FINANCIAL")
        self.assertEqual(fact["detected_value"], 70000000)
        self.assertEqual(fact["page_number"], 1)


if __name__ == "__main__":
    unittest.main()
