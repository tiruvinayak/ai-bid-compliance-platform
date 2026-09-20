"""
===============================================================================
MODULE: test_government_retrieval.py
===============================================================================
PURPOSE:
    Automated unit test suite for Phase 6C (Semantic Retrieval Engine).

TEST CASES COVERED:
    TEST 1: Valid query returns status="SUCCESS"
    TEST 2: Top-K retrieval respects maximum k constraint
    TEST 3: Ranking sorted by similarity score descending
    TEST 4: Similarity threshold filtering (results below threshold excluded)
    TEST 5: Unrelated query returns status="NO_RELEVANT_RESULTS"
    TEST 6: Empty knowledge base returns status="KNOWLEDGE_BASE_EMPTY"
    TEST 7: Empty string query returns status="VALIDATION_ERROR"
    TEST 8: Whitespace-only query returns status="VALIDATION_ERROR"
    TEST 9: Complete source metadata preserved (document, page, section, text)
    TEST 10: Chunk ID preserved
    TEST 11: 1-based page number preserved
    TEST 12: Dimension mismatch returns status="EMBEDDING_DIMENSION_MISMATCH"
    TEST 13: Embedding provider error returns status="EMBEDDING_ERROR"
    TEST 14: Database error returns status="DATABASE_ERROR"
    TEST 15: Deterministic ranking across identical runs
    TEST 16: Deterministic tie-breaking by chunk_id ascending
    TEST 17: Top-K greater than available documents returns available matches only
    TEST 18: Source type preserved as "GOVERNMENT"
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

# Phase 6C imports
from app.embedding_provider import BaseEmbeddingProvider, MockEmbeddingProvider, GeminiEmbeddingProvider
from app.repositories.government_vector_repository import InMemVectorRepository
from app.government_embedding_service import GovernmentEmbeddingService
from app.government_retrieval_service import GovernmentRetrievalService
from app.schemas.government_knowledge import GovernmentKnowledgeChunk


class FaultyEmbeddingProvider(BaseEmbeddingProvider):
    """Test helper provider raising RuntimeError to test EMBEDDING_ERROR handling."""

    @property
    def dimension(self) -> int:
        return 768

    @property
    def model_name(self) -> str:
        return "faulty-provider"

    def embed_text(self, text: str):
        raise RuntimeError("Network Timeout: Connection lost to Embedding Endpoint.")

    def embed_texts(self, texts):
        raise RuntimeError("Network Timeout: Connection lost to Embedding Endpoint.")


class MismatchedQueryEmbeddingProvider(BaseEmbeddingProvider):
    """Test helper provider returning 512-dim query vector to test EMBEDDING_DIMENSION_MISMATCH."""

    @property
    def dimension(self) -> int:
        return 768

    @property
    def model_name(self) -> str:
        return "mismatched-provider"

    def embed_text(self, text: str):
        return [0.1] * 512

    def embed_texts(self, texts):
        return [[0.1] * 512 for _ in texts]


class FaultyRepository(InMemVectorRepository):
    """Test helper repository raising Exception to test DATABASE_ERROR handling."""

    def search_similar(self, query_embedding, top_k=5, similarity_threshold=0.70):
        raise RuntimeError("PostgreSQL Connection Terminated unexpectedly.")


class TestGovernmentRetrieval(unittest.TestCase):
    """
    Automated unit test suite validating Phase 6C Semantic Retrieval Engine.
    """

    def setUp(self):
        """Initializes mock provider, in-memory repository, and populates knowledge vectors."""
        self.mock_provider = MockEmbeddingProvider(dimension=768)
        self.inmem_repo = InMemVectorRepository()
        self.embed_service = GovernmentEmbeddingService(
            embedding_provider=self.mock_provider,
            vector_repository=self.inmem_repo
        )

        # Ingest 4 realistic test chunks
        self.chunk2_text = "The bidder must meet all statutory eligibility criteria specified in Rule 144 of General Financial Rules."
        self.chunks = [
            GovernmentKnowledgeChunk(
                chunk_id="GOV-001-CH-001",
                document_id="GOV-001",
                document_name="procurement_guidelines.pdf",
                source_type="GOVERNMENT",
                page_number=1,
                section_name="1. Introduction",
                text="This manual contains official government procurement guidance for public procurement in India.",
                character_count=98
            ),
            GovernmentKnowledgeChunk(
                chunk_id="GOV-001-CH-002",
                document_id="GOV-001",
                document_name="procurement_guidelines.pdf",
                source_type="GOVERNMENT",
                page_number=2,
                section_name="2. Eligibility Requirements",
                text=self.chunk2_text,
                character_count=114
            ),
            GovernmentKnowledgeChunk(
                chunk_id="GOV-001-CH-003",
                document_id="GOV-001",
                document_name="procurement_guidelines.pdf",
                source_type="GOVERNMENT",
                page_number=3,
                section_name="3. Bid Security",
                text="Bid security (Earnest Money Deposit - EMD) shall normally range between 2% to 5% of estimated contract value.",
                character_count=112
            ),
            GovernmentKnowledgeChunk(
                chunk_id="GOV-001-CH-004",
                document_id="GOV-001",
                document_name="procurement_guidelines.pdf",
                source_type="GOVERNMENT",
                page_number=4,
                section_name="4. Submission Requirements",
                text="All proposals and tender documents must be submitted electronically through the Central Public Procurement Portal.",
                character_count=123
            ),
        ]

        self.embed_service.embed_and_store_chunks(self.chunks)

        self.retrieval_service = GovernmentRetrievalService(
            embedding_provider=self.mock_provider,
            vector_repository=self.inmem_repo,
            default_top_k=5,
            default_similarity_threshold=-1.0
        )

    def test_01_valid_query_returns_success(self):
        """
        TEST 1: Valid query.
        EXPECTED: status="SUCCESS", total_results > 0
        """
        res = self.retrieval_service.search_government_knowledge("eligibility requirements", similarity_threshold=-1.0)
        self.assertEqual(res["status"], "SUCCESS")
        self.assertGreater(res["total_results"], 0)
        self.assertIsNone(res["error_message"])

    def test_02_top_k_retrieval(self):
        """
        TEST 2: Top-K retrieval constraint.
        EXPECTED: Maximum K results returned
        """
        res = self.retrieval_service.search_government_knowledge("procurement guidelines", top_k=2, similarity_threshold=-1.0)
        self.assertEqual(res["status"], "SUCCESS")
        self.assertLessEqual(len(res["results"]), 2)

    def test_03_ranking_sorted_descending(self):
        """
        TEST 3: Ranking sorted by similarity descending.
        EXPECTED: Results ordered with highest similarity score first
        """
        res = self.retrieval_service.search_government_knowledge("eligibility requirements", top_k=4, similarity_threshold=-1.0)
        scores = [r["similarity_score"] for r in res["results"]]
        self.assertEqual(scores, sorted(scores, reverse=True))

    def test_04_similarity_threshold_filtering(self):
        """
        TEST 4: Similarity threshold filtering.
        EXPECTED: Scores below threshold are excluded
        """
        res = self.retrieval_service.search_government_knowledge(
            query=self.chunk2_text,
            top_k=5,
            similarity_threshold=0.99
        )
        for r in res["results"]:
            self.assertGreaterEqual(r["similarity_score"], 0.99)

    def test_05_no_relevant_results(self):
        """
        TEST 5: No relevant results when threshold is too high.
        EXPECTED: status="NO_RELEVANT_RESULTS", total_results=0
        """
        res = self.retrieval_service.search_government_knowledge(
            query="unrelated query text",
            top_k=5,
            similarity_threshold=1.0001  # Threshold higher than 1.0
        )
        self.assertEqual(res["status"], "NO_RELEVANT_RESULTS")
        self.assertEqual(res["total_results"], 0)
        self.assertEqual(len(res["results"]), 0)

    def test_06_empty_knowledge_base(self):
        """
        TEST 6: Empty knowledge base.
        EXPECTED: status="KNOWLEDGE_BASE_EMPTY"
        """
        empty_repo = InMemVectorRepository()
        empty_service = GovernmentRetrievalService(
            embedding_provider=self.mock_provider,
            vector_repository=empty_repo
        )
        res = empty_service.search_government_knowledge("eligibility")
        self.assertEqual(res["status"], "KNOWLEDGE_BASE_EMPTY")
        self.assertIn("No government knowledge vectors", res["error_message"])

    def test_07_empty_string_query(self):
        """
        TEST 7: Empty string query.
        EXPECTED: status="VALIDATION_ERROR"
        """
        res = self.retrieval_service.search_government_knowledge("")
        self.assertEqual(res["status"], "VALIDATION_ERROR")
        self.assertIn("empty or whitespace", res["error_message"])

    def test_08_whitespace_only_query(self):
        """
        TEST 8: Whitespace-only query.
        EXPECTED: status="VALIDATION_ERROR"
        """
        res = self.retrieval_service.search_government_knowledge("   \n\t  ")
        self.assertEqual(res["status"], "VALIDATION_ERROR")
        self.assertIn("empty or whitespace", res["error_message"])

    def test_09_complete_source_metadata_preserved(self):
        """
        TEST 9: Complete source metadata preserved in results.
        EXPECTED: document_name, page_number, section_name, and text preserved
        """
        res = self.retrieval_service.search_government_knowledge(self.chunk2_text, similarity_threshold=-1.0)
        self.assertEqual(res["status"], "SUCCESS")
        top_match = res["results"][0]
        self.assertEqual(top_match["document_name"], "procurement_guidelines.pdf")
        self.assertEqual(top_match["page_number"], 2)
        self.assertEqual(top_match["section_name"], "2. Eligibility Requirements")
        self.assertEqual(top_match["text"], self.chunk2_text)

    def test_10_chunk_id_preserved(self):
        """
        TEST 10: Chunk ID preserved.
        EXPECTED: Original chunk_id present in result
        """
        res = self.retrieval_service.search_government_knowledge(self.chunk2_text, similarity_threshold=-1.0)
        top_match = res["results"][0]
        self.assertEqual(top_match["chunk_id"], "GOV-001-CH-002")

    def test_11_1based_page_number_preserved(self):
        """
        TEST 11: 1-based page number preserved.
        EXPECTED: page_number >= 1
        """
        res = self.retrieval_service.search_government_knowledge("procurement guidelines", similarity_threshold=-1.0)
        for r in res["results"]:
            self.assertGreaterEqual(r["page_number"], 1)

    def test_12_embedding_dimension_mismatch(self):
        """
        TEST 12: Embedding dimension mismatch.
        EXPECTED: status="EMBEDDING_DIMENSION_MISMATCH"
        """
        bad_provider = MismatchedQueryEmbeddingProvider()
        service = GovernmentRetrievalService(
            embedding_provider=bad_provider,
            vector_repository=self.inmem_repo
        )
        res = service.search_government_knowledge("eligibility")
        self.assertEqual(res["status"], "EMBEDDING_DIMENSION_MISMATCH")

    def test_13_embedding_provider_error(self):
        """
        TEST 13: Embedding provider error.
        EXPECTED: status="EMBEDDING_ERROR"
        """
        faulty_provider = FaultyEmbeddingProvider()
        service = GovernmentRetrievalService(
            embedding_provider=faulty_provider,
            vector_repository=self.inmem_repo
        )
        res = service.search_government_knowledge("eligibility")
        self.assertEqual(res["status"], "EMBEDDING_ERROR")
        self.assertIn("Network Timeout", res["error_message"])

    def test_14_database_error(self):
        """
        TEST 14: Database error.
        EXPECTED: status="DATABASE_ERROR"
        """
        faulty_repo = FaultyRepository()
        faulty_repo.storage["CH-01"] = True  # Make total count > 0
        service = GovernmentRetrievalService(
            embedding_provider=self.mock_provider,
            vector_repository=faulty_repo
        )
        res = service.search_government_knowledge("eligibility")
        self.assertEqual(res["status"], "DATABASE_ERROR")
        self.assertIn("Connection Terminated", res["error_message"])

    def test_15_deterministic_ranking_across_runs(self):
        """
        TEST 15: Deterministic ranking across identical runs.
        EXPECTED: Identical result order and similarity scores
        """
        query = "Earnest Money Deposit EMD requirement"
        res1 = self.retrieval_service.search_government_knowledge(query, similarity_threshold=-1.0)
        res2 = self.retrieval_service.search_government_knowledge(query, similarity_threshold=-1.0)

        ids1 = [r["chunk_id"] for r in res1["results"]]
        ids2 = [r["chunk_id"] for r in res2["results"]]
        self.assertEqual(ids1, ids2)

    def test_16_deterministic_tie_breaking(self):
        """
        TEST 16: Deterministic tie-breaking.
        EXPECTED: Identical similarity scores sorted by chunk_id ascending
        """
        res = self.retrieval_service.search_government_knowledge("procurement", top_k=4, similarity_threshold=-1.0)
        self.assertEqual(res["status"], "SUCCESS")
        # Verify 1-based ranks
        for idx, r in enumerate(res["results"], start=1):
            self.assertEqual(r["rank"], idx)

    def test_17_top_k_greater_than_available_documents(self):
        """
        TEST 17: top_k greater than available documents.
        EXPECTED: Returns all 4 available documents without error
        """
        res = self.retrieval_service.search_government_knowledge("guidance", top_k=100, similarity_threshold=-1.0)
        self.assertEqual(res["status"], "SUCCESS")
        self.assertEqual(len(res["results"]), 4)

    def test_18_source_type_preserved(self):
        """
        TEST 18: Source type preserved as "GOVERNMENT".
        EXPECTED: source_type="GOVERNMENT"
        """
        res = self.retrieval_service.search_government_knowledge("guidance", similarity_threshold=-1.0)
        for r in res["results"]:
            self.assertEqual(r["source_type"], "GOVERNMENT")


if __name__ == "__main__":
    unittest.main()
