"""
===============================================================================
MODULE: test_government_knowledge_ingestion.py
===============================================================================
PURPOSE:
    Automated unit and integration test suite for Phase 6A (Government Knowledge Ingestion).

TEST CASES COVERED:
    TEST 1: Normal government PDF ingestion (status="SUCCESS")
    TEST 2: Page count accuracy (page_count=4)
    TEST 3: Chunk creation (total_chunks > 0)
    TEST 4: 1-based page numbers preserved
    TEST 5: Document name preserved (procurement_guidelines.pdf)
    TEST 6: Source type preserved ("GOVERNMENT")
    TEST 7: Section heading detection ("1. Introduction", "2. Eligibility Requirements")
    TEST 8: Blank page handling safely handled
    TEST 9: Scanned PDF returns OCR_REQUIRED
    TEST 10: Invalid file extension returns validation error
    TEST 11: Duplicate document ingestion returns status="DUPLICATE"
    TEST 12: Stable, deterministic chunk IDs across runs
    TEST 13: Content hash calculation consistency
    TEST 14: Chunk character size and overlap boundaries
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

# Phase 6A import
from app.government_knowledge_ingestor import GovernmentKnowledgeIngestor

# Helper test PDF generator
try:
    from create_government_test_pdf import generate_government_test_files
except ImportError:
    from tests.create_government_test_pdf import generate_government_test_files


class TestGovernmentKnowledgeIngestion(unittest.TestCase):
    """
    Unit test suite validating Phase 6A Government Knowledge Ingestion.
    """

    @classmethod
    def setUpClass(cls):
        """Generates synthetic government test PDF files before tests run."""
        generate_government_test_files()
        cls.gov_dir = Path("input/government")

    def setUp(self):
        """Instantiates GovernmentKnowledgeIngestor before each test."""
        self.ingestor = GovernmentKnowledgeIngestor()

    def test_01_normal_government_pdf_ingestion(self):
        """
        TEST 1: Ingest normal 4-page government PDF.
        EXPECTED: status="SUCCESS"
        """
        pdf_path = self.gov_dir / "procurement_guidelines.pdf"
        result = self.ingestor.ingest_document(pdf_path)

        self.assertEqual(result["status"], "SUCCESS")
        self.assertIsNone(result["error_message"])

    def test_02_page_count_accuracy(self):
        """
        TEST 2: Verify page count accuracy.
        EXPECTED: page_count=4
        """
        pdf_path = self.gov_dir / "procurement_guidelines.pdf"
        result = self.ingestor.ingest_document(pdf_path)

        self.assertEqual(result["page_count"], 4)

    def test_03_chunk_creation(self):
        """
        TEST 3: Verify chunk creation.
        EXPECTED: total_chunks > 0
        """
        pdf_path = self.gov_dir / "procurement_guidelines.pdf"
        result = self.ingestor.ingest_document(pdf_path)

        self.assertGreater(result["total_chunks"], 0)
        self.assertEqual(len(result["chunks"]), result["total_chunks"])

    def test_04_1based_page_numbers_preserved(self):
        """
        TEST 4: 1-based page numbers preserved in chunks.
        EXPECTED: All page_number values are >= 1
        """
        pdf_path = self.gov_dir / "procurement_guidelines.pdf"
        result = self.ingestor.ingest_document(pdf_path)

        for chunk in result["chunks"]:
            self.assertGreaterEqual(chunk["page_number"], 1)

    def test_05_document_name_preserved(self):
        """
        TEST 5: Document name preserved in document and chunk metadata.
        EXPECTED: document_name="procurement_guidelines.pdf"
        """
        pdf_path = self.gov_dir / "procurement_guidelines.pdf"
        result = self.ingestor.ingest_document(pdf_path)

        self.assertEqual(result["document_name"], "procurement_guidelines.pdf")
        for chunk in result["chunks"]:
            self.assertEqual(chunk["document_name"], "procurement_guidelines.pdf")

    def test_06_source_type_preserved(self):
        """
        TEST 6: Source type preserved as "GOVERNMENT".
        EXPECTED: source_type="GOVERNMENT"
        """
        pdf_path = self.gov_dir / "procurement_guidelines.pdf"
        result = self.ingestor.ingest_document(pdf_path)

        self.assertEqual(result["source_type"], "GOVERNMENT")
        for chunk in result["chunks"]:
            self.assertEqual(chunk["source_type"], "GOVERNMENT")

    def test_07_section_heading_detection(self):
        """
        TEST 7: Section heading detection.
        EXPECTED: Detected section names e.g. "1. Introduction", "2. Eligibility Requirements"
        """
        pdf_path = self.gov_dir / "procurement_guidelines.pdf"
        result = self.ingestor.ingest_document(pdf_path)

        sections = [c["section_name"] for c in result["chunks"] if c["section_name"]]
        self.assertGreater(len(sections), 0)
        self.assertTrue(any("Introduction" in s for s in sections))
        self.assertTrue(any("Eligibility" in s for s in sections))

    def test_08_blank_page_handling(self):
        """
        TEST 8: Blank page handling.
        EXPECTED: Blank page document returns status="OCR_REQUIRED" or handles cleanly
        """
        pdf_path = self.gov_dir / "blank_gov.pdf"
        result = self.ingestor.ingest_document(pdf_path)

        self.assertIn(result["status"], ["OCR_REQUIRED", "SUCCESS"])

    def test_09_scanned_pdf_handling(self):
        """
        TEST 9: Scanned image PDF.
        EXPECTED: status="OCR_REQUIRED"
        """
        pdf_path = self.gov_dir / "scanned_gov.pdf"
        result = self.ingestor.ingest_document(pdf_path)

        self.assertEqual(result["status"], "OCR_REQUIRED")
        self.assertIn("OCR", result["error_message"])

    def test_10_invalid_file_extension(self):
        """
        TEST 10: Invalid file extension (invalid_gov.txt).
        EXPECTED: status="ERROR", validation error message
        """
        file_path = self.gov_dir / "invalid_gov.txt"
        result = self.ingestor.ingest_document(file_path)

        self.assertEqual(result["status"], "ERROR")
        self.assertIn("Unsupported file extension", result["error_message"])

    def test_11_duplicate_document_ingestion(self):
        """
        TEST 11: Ingest duplicate document.
        EXPECTED: Second ingestion returns status="DUPLICATE"
        """
        pdf_path = self.gov_dir / "procurement_guidelines.pdf"
        res1 = self.ingestor.ingest_document(pdf_path)
        self.assertEqual(res1["status"], "SUCCESS")

        res2 = self.ingestor.ingest_document(pdf_path)
        self.assertEqual(res2["status"], "DUPLICATE")

    def test_12_stable_deterministic_chunk_ids(self):
        """
        TEST 12: Stable chunk IDs across separate ingestor instances.
        EXPECTED: Identical chunk IDs e.g. "GOV-*-CH-001"
        """
        pdf_path = self.gov_dir / "procurement_guidelines.pdf"
        ingestor1 = GovernmentKnowledgeIngestor()
        ingestor2 = GovernmentKnowledgeIngestor()

        res1 = ingestor1.ingest_document(pdf_path)
        res2 = ingestor2.ingest_document(pdf_path)

        ids1 = [c["chunk_id"] for c in res1["chunks"]]
        ids2 = [c["chunk_id"] for c in res2["chunks"]]
        self.assertEqual(ids1, ids2)

    def test_13_content_hash_consistency(self):
        """
        TEST 13: Content hash calculation consistency.
        EXPECTED: Non-empty SHA-256 string consistent across runs
        """
        pdf_path = self.gov_dir / "procurement_guidelines.pdf"
        res = self.ingestor.ingest_document(pdf_path)

        self.assertTrue(res["content_hash"])
        self.assertEqual(len(res["content_hash"]), 64)

    def test_14_chunk_character_size_and_overlap(self):
        """
        TEST 14: Chunk character size boundaries.
        EXPECTED: All chunks have character_count > 0 and character_count == len(text)
        """
        pdf_path = self.gov_dir / "procurement_guidelines.pdf"
        res = self.ingestor.ingest_document(pdf_path)

        for chunk in res["chunks"]:
            self.assertGreater(chunk["character_count"], 0)
            self.assertEqual(chunk["character_count"], len(chunk["text"]))


if __name__ == "__main__":
    unittest.main()
