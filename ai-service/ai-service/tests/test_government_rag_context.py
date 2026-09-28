"""
Regression tests: Government RAG live project context grounding.

Covers the demo fix where the Government AI assistant must answer questions
about platform data (bids, compliance, risks) from real database records
supplied as `context`, while still refusing unrelated questions cleanly.
"""

import os
import sys
import unittest
from pathlib import Path

# Enforce mock LLM provider before any application module import.
os.environ["LLM_PROVIDER"] = "mock"

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from fastapi.testclient import TestClient

from app.api_server import app
from app.embedding_provider import MockEmbeddingProvider
from app.government_embedding_service import GovernmentEmbeddingService
from app.government_knowledge_ingestor import GovernmentKnowledgeIngestor
from app.government_rag_service import GovernmentRAGService, MockRAGLLM
from app.government_retrieval_service import GovernmentRetrievalService
from app.repositories.government_vector_repository import InMemVectorRepository
from app.schemas.government_knowledge import GovernmentKnowledgeChunk

# Force the process-wide shared repository to be fileless BEFORE any route can
# create it with a storage file, so tests never read or write the real
# output/government_knowledge/vectors_store.json knowledge base.
InMemVectorRepository.get_shared_instance()

SAMPLE_CONTEXT = {
    "project": {"name": "SIH26100 Procurement Platform"},
    "bids": [
        {"bid_id": "GEM-2026-001", "bidder_name": "ABC Technologies Pvt Ltd",
         "compliance_percentage": 78.6, "risk_level": "MEDIUM"},
        {"bid_id": "GEM-2026-003", "bidder_name": "Zenith IT Solutions Ltd",
         "compliance_percentage": 75.0, "risk_level": "MEDIUM"},
    ],
    "conflicts": [],
}


class TestGovernmentRAGProjectContext(unittest.TestCase):
    """Unit tests for project_context grounding in GovernmentRAGService."""

    def _empty_service(self):
        empty_repo = InMemVectorRepository()
        retrieval = GovernmentRetrievalService(
            embedding_provider=MockEmbeddingProvider(dimension=768),
            vector_repository=empty_repo,
        )
        return GovernmentRAGService(retrieval_service=retrieval, llm_provider=MockRAGLLM())

    def _seeded_service(self):
        repo = InMemVectorRepository()
        embed_provider = MockEmbeddingProvider(dimension=768)
        retrieval = GovernmentRetrievalService(
            embedding_provider=embed_provider,
            vector_repository=repo,
        )
        chunks = [GovernmentKnowledgeChunk(
            chunk_id="GOV-TEST-CH-001",
            document_id="GOV-TEST",
            document_name="procurement_guidelines.pdf",
            source_type="GOVERNMENT",
            page_number=2,
            section_name="Eligibility Requirements",
            text="The bidder must meet all statutory eligibility criteria under General Financial Rules.",
            character_count=96,
        )]
        GovernmentEmbeddingService(embedding_provider=embed_provider, vector_repository=repo) \
            .embed_and_store_chunks(chunks)
        return GovernmentRAGService(retrieval_service=retrieval, llm_provider=MockRAGLLM())

    def test_01_context_only_returns_grounded_live_data_source(self):
        res = self._empty_service().ask_government_knowledge(
            query="Which bid has the highest compliance percentage?",
            project_context=SAMPLE_CONTEXT,
        )
        self.assertEqual(res["status"], "SUCCESS")
        self.assertEqual(res["grounding_status"], "GROUNDED")
        self.assertGreaterEqual(len(res["sources"]), 1)
        source = res["sources"][0]
        self.assertEqual(source["chunk_id"], "PROJECT-CONTEXT-001")
        self.assertIn("Live Project Data", source["document_name"])
        self.assertEqual(source["page_number"], 0)
        self.assertIn("GEM-2026-001", source["quoted_text"])

    def test_02_context_survives_empty_knowledge_base(self):
        res = self._empty_service().ask_government_knowledge(
            query="What conflicts exist on bid GEM-2026-001?",
            project_context=SAMPLE_CONTEXT,
        )
        self.assertNotEqual(res["status"], "INSUFFICIENT_GOVERNMENT_EVIDENCE")
        self.assertEqual(res["status"], "SUCCESS")
        self.assertEqual(res["grounding_status"], "GROUNDED")

    def test_03_no_context_on_empty_knowledge_base_still_refuses(self):
        res = self._empty_service().ask_government_knowledge(
            query="What are the eligibility requirements?",
        )
        self.assertEqual(res["status"], "INSUFFICIENT_GOVERNMENT_EVIDENCE")
        self.assertEqual(res["grounding_status"], "INSUFFICIENT_EVIDENCE")
        self.assertEqual(len(res["sources"]), 0)

    def test_04_context_bundled_with_qualifying_guideline_chunks(self):
        res = self._seeded_service().ask_government_knowledge(
            query="bidder eligibility requirements",
            min_similarity=0.0,
            project_context=SAMPLE_CONTEXT,
        )
        self.assertEqual(res["status"], "SUCCESS")
        doc_names = [s["document_name"] for s in res["sources"]]
        self.assertIn("Live Project Data (SIH26100 Bid Database)", doc_names)
        self.assertIn("procurement_guidelines.pdf", doc_names)

    def test_05_api_accepts_context_and_grounds_on_it(self):
        client = TestClient(app)
        response = client.post("/api/ai/government/ask", json={
            "question": "Which bid has the highest compliance percentage?",
            "top_k": 5,
            "threshold": 1.0,
            "context": SAMPLE_CONTEXT,
        })
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "SUCCESS")
        self.assertEqual(data["grounding_status"], "GROUNDED")
        self.assertEqual(data["sources"][0]["document_name"], "Live Project Data (SIH26100 Bid Database)")

    def test_06_api_without_context_still_refuses_unrelated_question(self):
        client = TestClient(app)
        response = client.post("/api/ai/government/ask", json={
            "question": "Who won the cricket match yesterday?",
            "top_k": 5,
            "threshold": 0.70,
        })
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "INSUFFICIENT_GOVERNMENT_EVIDENCE")
        self.assertEqual(len(data["sources"]), 0)


if __name__ == "__main__":
    unittest.main()
