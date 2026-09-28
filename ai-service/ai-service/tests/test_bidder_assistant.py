# Imports sys, os, and Path modules for python path resolution and environment setup.
import sys
import os
from pathlib import Path

# Enforces Mock LLM provider mode before any application modules are imported.
# Required to prevent live Ollama/Gemini calls and keep the suite deterministic.
os.environ["LLM_PROVIDER"] = "mock"

# Resolves project root directory path (ai-service).
# Required so Python imports can resolve 'app' module cleanly when run directly.
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# Imports unittest framework for structured python test cases.
import unittest
import json
from unittest.mock import patch

# Imports TestClient from fastapi.testclient.
from fastapi.testclient import TestClient

# Imports the FastAPI application instance and the bidder assistant service.
from app.api_server import app
from app.bidder_assistant_service import BidderAssistantService
from app.llm_client import BaseLLMProvider

CHAT_URL = "/api/ai/bidder-assistant/chat"

# Enriched context shaped exactly like the Spring Boot AiAssistantService payload.
CONTEXT = {
    "tender": {"tenderId": "TND-GEM-2026-1042", "tenderTitle": "Sector modernization", "category": "IT"},
    "bid": {"bidId": "GEM-2026-001", "bidderName": "Acme Infra Ltd", "status": "SUBMITTED", "compliancePercentage": 87.5},
    "requirements": [
        {"requirement_id": "REQ-001", "category": "Financial", "description": "Valid GST Registration Certificate",
         "required_value": "Yes", "page_number": 1},
        {"requirement_id": "REQ-003", "category": "Financial", "description": "Minimum Annual Turnover",
         "required_value": "10 INR Crore", "page_number": 3},
    ],
    "bidder_facts": [
        {"fact_id": "FACT-ABC-001", "category": "tax", "field": "gstin",
         "detected_value": "07AABCT1234F1Z5", "unit": "", "page_number": 1,
         "source_document": "GST_Certificate_2026.pdf"},
    ],
    "compliance": [{"requirement_id": "REQ-001", "status": "PASS", "detected_value": "07AABCT1234F1Z5"}],
    "preliminary_verification": [],
    "evidence": [],
    "risk_conflicts": [],
}


class ScriptedLLMProvider(BaseLLMProvider):
    """Deterministic provider returning a scripted queue of raw responses."""

    def __init__(self, responses):
        self.responses = list(responses)
        self.prompts = []

    def generate_json(self, prompt: str, system_prompt: str) -> str:
        self.prompts.append(prompt)
        if not self.responses:
            raise RuntimeError("ScriptedLLMProvider exhausted")
        item = self.responses.pop(0)
        if isinstance(item, Exception):
            raise item
        return item


def llm_json(answer, citations, status="GROUNDED"):
    return json.dumps({"answer": answer, "citations": citations, "grounding_status": status})


def payload(question="What documents are required?", history=None, context=CONTEXT):
    body = {"question": question, "chat_history": history if history is not None else []}
    if context is not None:
        body["context"] = context
    return body


class TestBidderAssistantAPI(unittest.TestCase):
    """Bidder AI Assistant route + service regression tests (Phase 3 / §10)."""

    def post(self, body, responses):
        scripted = ScriptedLLMProvider(responses)
        service = BidderAssistantService(llm_provider=scripted)
        client = TestClient(app)
        with patch("app.api.routes.bidder_assistant.get_bidder_assistant_service",
                   return_value=service):
            response = client.post(CHAT_URL, json=body)
        return response, scripted

    def test_valid_grounded_response(self):
        response, _ = self.post(
            payload(),
            [llm_json("GST certificate is required on page 1.",
                      [{"type": "requirement", "id": "REQ-001", "page": 1}])]
        )
        self.assertEqual(200, response.status_code)
        data = response.json()
        self.assertEqual("GROUNDED", data["grounding_status"])
        self.assertEqual(1, len(data["citations"]))
        self.assertEqual("REQ-001", data["citations"][0]["id"])
        self.assertEqual(1, data["citations"][0]["page"])

    def test_empty_question_returns_400(self):
        response, scripted = self.post(payload(question="   "),
                                       [llm_json("never called", [])])
        self.assertEqual(400, response.status_code)
        self.assertEqual("EMPTY_QUESTION", response.json()["error_code"])
        self.assertEqual([], scripted.prompts)

    def test_missing_context_returns_400(self):
        response, scripted = self.post(payload(context=None),
                                       [llm_json("never called", [])])
        self.assertEqual(400, response.status_code)
        self.assertEqual("CONTEXT_REQUIRED", response.json()["error_code"])
        self.assertEqual([], scripted.prompts)

    def test_citation_pages_reconciled_and_fabricated_dropped(self):
        response, _ = self.post(
            payload(),
            [llm_json("Turnover requirement is on some page.",
                      [{"type": "requirement", "id": "REQ-001", "page": 99},
                       {"type": "fact", "id": "FAB-999", "page": 7},
                       {"type": "requirement", "id": "REQ-003", "page": 99}])]
        )
        self.assertEqual(200, response.status_code)
        citations = response.json()["citations"]
        ids = {c["id"]: c for c in citations}
        self.assertNotIn("FAB-999", ids)
        self.assertEqual(1, ids["REQ-001"]["page"])
        self.assertEqual(3, ids["REQ-003"]["page"])

    def test_inline_source_tags_extracted_stripped_and_reconciled(self):
        answer = "Your GSTIN is 07AABCT1234F1Z5. [SOURCE: fact, FACT-ABC-001, p.7]"
        response, _ = self.post(payload(), [llm_json(answer, [])])
        self.assertEqual(200, response.status_code)
        data = response.json()
        self.assertNotIn("[SOURCE", data["answer"])
        self.assertEqual(1, len(data["citations"]))
        self.assertEqual("FACT-ABC-001", data["citations"][0]["id"])
        self.assertEqual(1, data["citations"][0]["page"])

    def test_grounded_without_valid_citations_triggers_nudged_retry(self):
        bad = llm_json("Some claim.", [{"type": "fact", "id": "FAB-999", "page": 1}])
        good = llm_json("GSTIN is available.",
                        [{"type": "fact", "id": "FACT-ABC-001", "page": 1}])
        response, scripted = self.post(payload(), [bad, good])
        self.assertEqual(200, response.status_code)
        data = response.json()
        self.assertEqual("GROUNDED", data["grounding_status"])
        self.assertEqual("FACT-ABC-001", data["citations"][0]["id"])
        self.assertEqual(2, len(scripted.prompts))
        self.assertIn("citations", scripted.prompts[1])

    def test_grounded_without_valid_citations_downgrades_to_insufficient(self):
        bad = llm_json("Some claim.", [{"type": "fact", "id": "FAB-999", "page": 1}])
        response, _ = self.post(payload(), [bad, bad])
        self.assertEqual(200, response.status_code)
        data = response.json()
        self.assertEqual("INSUFFICIENT_EVIDENCE", data["grounding_status"])
        self.assertEqual([], data["citations"])

    def test_unsupported_question_stays_insufficient_without_citations(self):
        response, _ = self.post(
            payload(question="What is the weather on Mars?"),
            [llm_json("I could not find supporting evidence in the available tender/bid documents.",
                      [], status="INSUFFICIENT_EVIDENCE")]
        )
        self.assertEqual(200, response.status_code)
        data = response.json()
        self.assertEqual("INSUFFICIENT_EVIDENCE", data["grounding_status"])
        self.assertEqual([], data["citations"])

    def test_refusal_text_forces_insufficient_even_if_model_claims_grounded(self):
        response, _ = self.post(
            payload(question="What is the weather on Mars?"),
            [llm_json("I could not find supporting evidence for that in the context.",
                      [{"type": "requirement", "id": "REQ-001", "page": 1}])]
        )
        self.assertEqual(200, response.status_code)
        data = response.json()
        self.assertEqual("INSUFFICIENT_EVIDENCE", data["grounding_status"])
        self.assertEqual([], data["citations"])

    def test_malformed_llm_json_returns_generation_failed(self):
        response, _ = self.post(payload(), ["NOT JSON AT ALL {{", "STILL NOT JSON"])
        self.assertEqual(200, response.status_code)
        data = response.json()
        self.assertEqual("GENERATION_FAILED", data["grounding_status"])
        self.assertIsNotNone(data["error_message"])

    def test_llm_exception_returns_generation_failed(self):
        response, _ = self.post(payload(), [RuntimeError("Ollama connection refused")])
        self.assertEqual(200, response.status_code)
        data = response.json()
        self.assertEqual("GENERATION_FAILED", data["grounding_status"])
        self.assertIn("LLM API execution error", data["error_message"])

    def test_swapped_citation_fields_resolve_from_type_field(self):
        response, _ = self.post(
            payload(),
            [llm_json("GSTIN is available.",
                      [{"type": "fact-abc-001", "id": "R-001", "page": None},
                       {"type": "GST_Certificate_2026.pdf", "id": "FACT-ABC-001", "page": None}])]
        )
        self.assertEqual(200, response.status_code)
        data = response.json()
        self.assertEqual("GROUNDED", data["grounding_status"])
        self.assertEqual(1, len(data["citations"]))
        self.assertEqual("FACT-ABC-001", data["citations"][0]["id"])
        self.assertEqual("fact", data["citations"][0]["type"])
        self.assertEqual(1, data["citations"][0]["page"])

    def test_multi_turn_history_with_citations_array_is_accepted(self):
        history = [
            {"role": "user", "content": "Is my GST certificate available?"},
            {"role": "assistant", "content": "Yes, it is available.",
             "citations": [{"type": "fact", "id": "FACT-ABC-001", "page": 1}],
             "timestamp": "2026-09-28T12:00:00"},
        ]
        response, scripted = self.post(
            payload(question="What is my GSTIN?", history=history),
            [llm_json("Your GSTIN is 07AABCT1234F1Z5.",
                      [{"type": "fact", "id": "FACT-ABC-001", "page": 1}])]
        )
        self.assertEqual(200, response.status_code)
        self.assertEqual("GROUNDED", response.json()["grounding_status"])
        self.assertIn("Is my GST certificate available?", scripted.prompts[0])
        self.assertIn("Yes, it is available.", scripted.prompts[0])


if __name__ == "__main__":
    unittest.main()
