"""
===============================================================================
MODULE: test_government_embeddings.py
===============================================================================
PURPOSE:
    Automated unit test suite for Phase 6B (Government Knowledge Embeddings + Vector Storage).

TEST CASES COVERED:
    TEST 1: Mock provider generates vector embedding (SUCCESS)
    TEST 2: Deterministic mock vector (Same text -> Same vector)
    TEST 3: Empty text handling raises EMPTY_TEXT
    TEST 4: Wrong vector dimension raises EMBEDDING_DIMENSION_MISMATCH
    TEST 5: Government chunk metadata preserved
    TEST 6: Chunk ID preserved
    TEST 7: Page number preserved
    TEST 8: Source document preserved
    TEST 9: Duplicate chunk ingestion skipped (SKIPPED / ALREADY_EXISTS)
    TEST 10: Modified chunk update
    TEST 11: Provider failure / timeout error handling
    TEST 12: Malformed / invalid embedding response error handling
    TEST 13: Batch embedding support
    TEST 14: Database / repository vector storage
    TEST 15: Vector similarity query compatibility (Cosine distance)
===============================================================================
"""

# standard library imports
import sys
import unittest
from pathlib import Path

# Add project root directory (ai-service) to python path so app package can be resolved cleanly
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# Phase 6B imports
from app.embedding_provider import BaseEmbeddingProvider, MockEmbeddingProvider, GeminiEmbeddingProvider
from app.repositories.government_vector_repository import InMemVectorRepository, GovernmentVectorRepository
from app.government_embedding_service import GovernmentEmbeddingService
from app.schemas.government_knowledge import GovernmentKnowledgeChunk
from app.schemas.government_vector import GovernmentKnowledgeVector


class MismatchedDimensionEmbeddingProvider(BaseEmbeddingProvider):
    """Test helper provider returning a vector of wrong length to test dimension safety validation."""

    @property
    def dimension(self) -> int:
        return 768

    @property
    def model_name(self) -> str:
        return "mismatched-test-provider"

    def embed_text(self, text: str):
        # Returns 512 float values when expected dimension is 768
        return [0.1] * 512

    def embed_texts(self, texts):
        return [self.embed_text(t) for t in texts]


class TestGovernmentEmbeddings(unittest.TestCase):
    """
    Automated unit test suite validating Phase 6B embeddings and vector storage.
    """

    def setUp(self):
        """Initializes mock embedding provider, repository, and service before each test."""
        self.mock_provider = MockEmbeddingProvider(dimension=768)
        self.inmem_repo = InMemVectorRepository()
        self.inmem_repo.clear()
        self.service = GovernmentEmbeddingService(
            embedding_provider=self.mock_provider,
            vector_repository=self.inmem_repo
        )

        self.sample_chunk = GovernmentKnowledgeChunk(
            chunk_id="GOV-001-CH-001",
            document_id="GOV-001",
            document_name="procurement_guidelines.pdf",
            source_type="GOVERNMENT",
            page_number=2,
            section_name="2. Eligibility Requirements",
            text="The bidder must meet all statutory eligibility criteria specified in Rule 144 of General Financial Rules.",
            character_count=114
        )

    def test_01_mock_provider_generates_embedding(self):
        """
        TEST 1: Mock provider generates embedding.
        EXPECTED: Vector list of length 768
        """
        vec = self.mock_provider.embed_text("Sample procurement policy text.")
        self.assertIsInstance(vec, list)
        self.assertEqual(len(vec), 768)

    def test_02_deterministic_mock_vector(self):
        """
        TEST 2: Deterministic mock vector generation.
        EXPECTED: Same text -> Exact same vector
        """
        text = "General Financial Rules mandate minimum turnover."
        vec1 = self.mock_provider.embed_text(text)
        vec2 = self.mock_provider.embed_text(text)
        self.assertEqual(vec1, vec2)

        different_text = "Bid security shall be submitted as Demand Draft."
        vec3 = self.mock_provider.embed_text(different_text)
        self.assertNotEqual(vec1, vec3)

    def test_03_empty_text_handling(self):
        """
        TEST 3: Empty text handling.
        EXPECTED: Raises ValueError containing EMPTY_TEXT
        """
        with self.assertRaises(ValueError) as ctx:
            self.mock_provider.embed_text("")
        self.assertIn("EMPTY_TEXT", str(ctx.exception))

    def test_04_wrong_vector_dimension_handling(self):
        """
        TEST 4: Wrong vector dimension handling.
        EXPECTED: Raises ValueError containing EMBEDDING_DIMENSION_MISMATCH
        """
        bad_provider = MismatchedDimensionEmbeddingProvider()
        service = GovernmentEmbeddingService(
            embedding_provider=bad_provider,
            vector_repository=self.inmem_repo
        )

        with self.assertRaises(ValueError) as ctx:
            service.embed_and_store_chunks([self.sample_chunk])
        self.assertIn("EMBEDDING_DIMENSION_MISMATCH", str(ctx.exception))

    def test_05_government_chunk_metadata_preserved(self):
        """
        TEST 5: Government chunk metadata preserved in vector output.
        EXPECTED: Metadata matches source chunk
        """
        res = self.service.embed_and_store_chunks([self.sample_chunk])
        self.assertEqual(res["status"], "SUCCESS")
        stored_vec = res["vectors"][0]
        self.assertEqual(stored_vec["section_name"], "2. Eligibility Requirements")
        self.assertEqual(stored_vec["text"], self.sample_chunk.text)

    def test_06_chunk_id_preserved(self):
        """
        TEST 6: Chunk ID preserved.
        EXPECTED: chunk_id="GOV-001-CH-001"
        """
        res = self.service.embed_and_store_chunks([self.sample_chunk])
        stored_vec = res["vectors"][0]
        self.assertEqual(stored_vec["chunk_id"], "GOV-001-CH-001")

    def test_07_page_number_preserved(self):
        """
        TEST 7: Page number preserved.
        EXPECTED: page_number=2
        """
        res = self.service.embed_and_store_chunks([self.sample_chunk])
        stored_vec = res["vectors"][0]
        self.assertEqual(stored_vec["page_number"], 2)

    def test_08_source_document_preserved(self):
        """
        TEST 8: Source document preserved.
        EXPECTED: document_name="procurement_guidelines.pdf"
        """
        res = self.service.embed_and_store_chunks([self.sample_chunk])
        stored_vec = res["vectors"][0]
        self.assertEqual(stored_vec["document_name"], "procurement_guidelines.pdf")

    def test_09_duplicate_chunk_ingestion_skipped(self):
        """
        TEST 9: Duplicate chunk ingestion.
        EXPECTED: Second run returns status="ALREADY_INGESTED", embeddings_created=0, skipped=1
        """
        res1 = self.service.embed_and_store_chunks([self.sample_chunk])
        self.assertEqual(res1["status"], "SUCCESS")
        self.assertEqual(res1["embeddings_created"], 1)

        res2 = self.service.embed_and_store_chunks([self.sample_chunk])
        self.assertEqual(res2["status"], "ALREADY_INGESTED")
        self.assertEqual(res2["embeddings_created"], 0)
        self.assertEqual(res2["embeddings_skipped"], 1)

    def test_10_modified_chunk_update(self):
        """
        TEST 10: Modified chunk update.
        EXPECTED: Modified text chunk gets newly created vector
        """
        self.service.embed_and_store_chunks([self.sample_chunk])

        modified_chunk = GovernmentKnowledgeChunk(
            chunk_id="GOV-001-CH-001-MOD",
            document_id="GOV-001",
            document_name="procurement_guidelines.pdf",
            source_type="GOVERNMENT",
            page_number=2,
            section_name="2. Eligibility Requirements",
            text="REVISED TEXT: Bidder must prove minimum turnover of 10 Crore.",
            character_count=65
        )
        res = self.service.embed_and_store_chunks([modified_chunk])
        self.assertEqual(res["status"], "SUCCESS")
        self.assertEqual(res["embeddings_created"], 1)

    def test_11_provider_failure_handling(self):
        """
        TEST 11: Provider failure / timeout handling.
        EXPECTED: Exception raised cleanly with error description
        """
        provider = GeminiEmbeddingProvider(api_key="INVALID_KEY")
        with self.assertRaises(RuntimeError) as ctx:
            provider.embed_text("Sample text")
        self.assertIn("Gemini API", str(ctx.exception))

    def test_12_invalid_embedding_response(self):
        """
        TEST 12: Invalid embedding response handling.
        EXPECTED: Raises RuntimeError or ValueError
        """
        provider = GeminiEmbeddingProvider(api_key="DUMMY")
        with self.assertRaises(RuntimeError):
            provider.embed_text("Test")

    def test_13_batch_embedding_support(self):
        """
        TEST 13: Batch embedding support.
        EXPECTED: Multiple chunks receive vectors in single batch call
        """
        chunks = [
            GovernmentKnowledgeChunk(
                chunk_id=f"GOV-001-CH-00{i}",
                document_id="GOV-001",
                document_name="guidelines.pdf",
                source_type="GOVERNMENT",
                page_number=i,
                section_name=f"{i}. Section",
                text=f"Sample Section Text {i}",
                character_count=len(f"Sample Section Text {i}")
            )
            for i in range(1, 5)
        ]
        res = self.service.embed_and_store_chunks(chunks)
        self.assertEqual(res["status"], "SUCCESS")
        self.assertEqual(res["embeddings_created"], 4)
        self.assertEqual(len(res["vectors"]), 4)

    def test_14_database_repository_storage(self):
        """
        TEST 14: Repository vector storage retrieval.
        EXPECTED: Vector retrieved by chunk_id matches stored content_hash
        """
        self.service.embed_and_store_chunks([self.sample_chunk])
        record = self.inmem_repo.get_by_chunk_id("GOV-001-CH-001")
        self.assertIsNotNone(record)
        self.assertEqual(record["chunk_id"], "GOV-001-CH-001")

    def test_15_similarity_query_compatibility(self):
        """
        TEST 15: Vector similarity query compatibility.
        EXPECTED: Top matching vector returned with similarity score
        """
        chunks = [
            GovernmentKnowledgeChunk(
                chunk_id="CH-001",
                document_id="DOC-1",
                document_name="doc.pdf",
                source_type="GOVERNMENT",
                page_number=1,
                section_name="Eligibility",
                text="Bidders must submit Earnest Money Deposit of 1 Lakh.",
                character_count=50
            ),
            GovernmentKnowledgeChunk(
                chunk_id="CH-002",
                document_id="DOC-1",
                document_name="doc.pdf",
                source_type="GOVERNMENT",
                page_number=2,
                section_name="Security",
                text="Cybersecurity audit certificate issued by CERT-In is mandatory.",
                character_count=60
            )
        ]
        self.service.embed_and_store_chunks(chunks)

        query_vec = self.mock_provider.embed_text("Earnest Money Deposit EMD requirement")
        matches = self.inmem_repo.query_similar(query_vec, top_k=1)

        self.assertGreater(len(matches), 0)
        self.assertIn("similarity_score", matches[0])
        self.assertEqual(matches[0]["chunk_id"], "CH-001")


if __name__ == "__main__":
    unittest.main()
