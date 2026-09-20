"""
===============================================================================
MODULE: test_processor.py
===============================================================================
PURPOSE:
    Automated unit and integration test runner for Phase 1 document processor.

TEST CASES COVERED:
    TEST 1: Normal text PDF extraction.
    TEST 2: Multi-page document with 1-based page numbering.
    TEST 3: Document containing a blank/empty page.
    TEST 4: Error handling (non-existent file, non-PDF file).
    TEST 5: Scanned / image-only PDF detection.
===============================================================================
"""

# standard library imports
import sys
import unittest
from pathlib import Path

# Add project root directory (ai-service) to python path so app package can be imported easily
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# Import core function to test
from app.document_processor import extract_pdf_text, clean_extracted_text
# Import test PDF generator script safely regardless of execution mode
try:
    from create_test_pdfs import generate_test_files
except ImportError:
    from tests.create_test_pdfs import generate_test_files


class TestDocumentProcessor(unittest.TestCase):
    """
    Test suite for validating PDF document processing logic.
    Inherits from unittest.TestCase, which provides assertion methods like assertEqual, assertTrue, assertIn.
    """

    @classmethod
    def setUpClass(cls):
        """
        setUpClass runs once before any tests in this class execute.
        WHY: Ensures test PDF files are generated in input/ before testing begins.
        """
        generate_test_files()
        cls.input_dir = Path("input")

    def test_01_normal_text_extraction(self):
        """
        TEST 1: Verify normal text PDF extraction.
        EXPECTED: success=True, correct document name, page count = 3, text present.
        """
        pdf_path = self.input_dir / "sample_tender.pdf"
        result = extract_pdf_text(pdf_path)

        # Assert process succeeded
        self.assertTrue(result["success"], "Extraction should return success=True")
        # Assert document name is preserved
        self.assertEqual(result["document_name"], "sample_tender.pdf")
        # Assert page count matches expected
        self.assertEqual(result["page_count"], 3)
        # Assert page 1 contains key tender text
        self.assertIn("GOVERNMENT OF INDIA", result["pages"][0]["text"])

    def test_02_page_numbering(self):
        """
        TEST 2: Verify 1-based page numbering convention across multiple pages.
        EXPECTED: Page numbers must be 1, 2, 3 (NOT 0, 1, 2).
        """
        pdf_path = self.input_dir / "sample_tender.pdf"
        result = extract_pdf_text(pdf_path)

        page_numbers = [p["page_number"] for p in result["pages"]]
        # Assert 1-based page numbering convention
        self.assertEqual(page_numbers, [1, 2, 3], "Page numbers must be 1-based [1, 2, 3]")

    def test_03_empty_page_handling(self):
        """
        TEST 3: Verify handling of documents containing blank pages.
        EXPECTED: Page 2 must be flagged with has_text=False and notice message.
        """
        pdf_path = self.input_dir / "tender_with_blank_page.pdf"
        result = extract_pdf_text(pdf_path)

        self.assertTrue(result["success"])
        pages = result["pages"]
        self.assertEqual(len(pages), 3)

        # Page 1 has text
        self.assertTrue(pages[0]["has_text"])
        # Page 2 has NO text
        self.assertFalse(pages[1]["has_text"], "Page 2 should be flagged as having no text")
        self.assertIn("OCR will be added in a later phase", pages[1]["text"])
        # Page 3 has text
        self.assertTrue(pages[2]["has_text"])

    def test_04_error_handling(self):
        """
        TEST 4: Verify error handling for non-existent and invalid file types.
        EXPECTED: Clear error dictionary returned (success=False), no unhandled crash.
        """
        # Case A: Non-existent file
        res_missing = extract_pdf_text("input/non_existent_file.pdf")
        self.assertFalse(res_missing["success"])
        self.assertEqual(res_missing["error_type"], "FILE_NOT_FOUND")

        # Case B: Non-PDF file (.txt extension)
        res_invalid = extract_pdf_text("input/invalid_doc.txt")
        self.assertFalse(res_invalid["success"])
        self.assertEqual(res_invalid["error_type"], "INVALID_FILE_TYPE")

    def test_05_scanned_pdf_detection(self):
        """
        TEST 5: Verify scanned / image-only PDF handling.
        EXPECTED: is_scanned_or_empty=True, notice message provided.
        """
        pdf_path = self.input_dir / "scanned_doc.pdf"
        result = extract_pdf_text(pdf_path)

        self.assertTrue(result["success"])
        self.assertTrue(result["is_scanned_or_empty"], "Document should be detected as scanned/empty")
        self.assertIn("OCR will be added in a later phase", result["pages"][0]["text"])

    def test_06_text_cleaning(self):
        """
        TEST 6: Verify text cleaning logic works as expected.
        """
        dirty_text = "  Clause 1.1:    Turnover   \n\n\n\nMust exceed 5 Cr.  \t  "
        cleaned = clean_extracted_text(dirty_text)
        # Verify multiple spaces reduced to 1, tabs removed, excess newlines reduced
        self.assertEqual(cleaned, "Clause 1.1: Turnover\n\nMust exceed 5 Cr.")


if __name__ == "__main__":
    unittest.main()
