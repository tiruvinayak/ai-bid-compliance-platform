# Imports sys, os, and Path modules for python path resolution and environment setup.
import sys
import os
from pathlib import Path

# Enforces Mock LLM provider mode before any application modules are imported.
# Required to prevent live Gemini API calls and avoid HTTP 429 quota errors.
os.environ["LLM_PROVIDER"] = "mock"

# Resolves project root directory path (ai-service).
# Required so Python imports can resolve 'app' module cleanly when run directly.
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# Imports unittest framework for running structured python test cases.
# Required to organize API integration tests into runnable unittest suites.
import unittest

# Imports json module for parsing and formatting JSON payloads.
# Required to serialize request data and inspect API response bodies.
import json

# Imports TestClient from fastapi.testclient.
# Required to perform synchronous HTTP requests against the FastAPI app in-memory.
from fastapi.testclient import TestClient

# Imports the FastAPI application instance from app.api_server.
# Required to bind the TestClient to the application routing pipeline.
from app.api_server import app

# Imports PyMuPDF fitz library for creating on-the-fly test PDF streams.
# Required to generate dynamic test PDF files during API integration testing.
import fitz

# Imports Phase 6A ingestor and Phase 6B embedding service for RAG test setup.
# Required to seed government knowledge vector repository before RAG API tests.
from app.government_knowledge_ingestor import GovernmentKnowledgeIngestor
from app.government_embedding_service import GovernmentEmbeddingService
from app.embedding_provider import MockEmbeddingProvider
from app.repositories.government_vector_repository import InMemVectorRepository
from app.government_retrieval_service import GovernmentRetrievalService


# Defines API integration test suite class inheriting from unittest.TestCase.
# Required to validate all 12 Phase 7 REST API endpoints and error scenarios.
class TestAIRESTApiEndpoints(unittest.TestCase):
    # Setup class method running once before API test suite execution.
    # Required to initialize TestClient and seed synthetic government knowledge.
    @classmethod
    def setUpClass(cls):
        # Enforces Mock LLM provider mode before server routes execute.
        # Required to guarantee deterministic offline execution for test suite.
        os.environ["LLM_PROVIDER"] = "mock"

        # Creates TestClient bound to the FastAPI application instance.
        # Required to execute HTTP GET and POST requests against API routes.
        cls.client = TestClient(app)

        # Defines path to accuracy dataset directory.
        # Required to locate synthetic tender and bidder PDF test files.
        cls.dataset_dir = Path(__file__).resolve().parent / "accuracy_dataset"

        # Seeds process-wide in-memory vector repository with government knowledge chunks.
        # Required to provide retrievable vector context for Government RAG API tests.
        cls.repo = InMemVectorRepository.get_shared_instance()
        # Instantiates Mock embedding provider.
        # Required to embed text chunks deterministically during test setup.
        cls.embed_provider = MockEmbeddingProvider(dimension=768)
        # Instantiates government document ingestor.
        # Required to parse test government PDF document into chunks.
        ingestor = GovernmentKnowledgeIngestor()

        # Ingests synthetic government PDF document.
        # Required to generate knowledge chunks with page numbers and section titles.
        gov_pdf = cls.dataset_dir / "accuracy_government.pdf"
        if gov_pdf.exists():
            # Ingests PDF document pages into chunk dictionary list.
            # Required to obtain structured chunks for vector storage.
            gov_res = ingestor.ingest_document(str(gov_pdf))
            # Extracts chunks list from ingestion result.
            # Required to pass chunk data to embedding service.
            chunks = gov_res.get("chunks", [])
            # Instantiates embedding service orchestrator.
            # Required to generate embeddings and store vectors in repository.
            embed_service = GovernmentEmbeddingService(
                embedding_provider=cls.embed_provider,
                vector_repository=cls.repo
            )
            # Embeds and stores chunks in vector repository.
            # Required to enable vector similarity search during RAG tests.
            embed_service.embed_and_store_chunks(chunks)

    # Test 1: GET /api/ai/health check.
    # Required to verify that the health endpoint returns status UP and version 1.0.
    def test_01_health_endpoint(self):
        # Sends GET request to /api/ai/health endpoint.
        # Required to execute the health check route.
        response = self.client.get("/api/ai/health")
        # Asserts HTTP status code is 200 OK.
        # Required to verify healthy HTTP response code.
        self.assertEqual(response.status_code, 200)
        # Parses JSON response dictionary.
        # Required to inspect returned status fields.
        data = response.json()
        # Asserts status field equals "UP".
        # Required to confirm operational readiness indicator.
        self.assertEqual(data.get("status"), "UP")
        # Asserts service field equals "ai-service".
        # Required to verify service component identifier.
        self.assertEqual(data.get("service"), "ai-service")
        # Asserts version field equals "1.0".
        # Required to verify API version metadata.
        self.assertEqual(data.get("version"), "1.0")

    # Test 2: POST /api/ai/process-tender document processing.
    # Required to verify Phase 1 + Phase 2 tender requirement extraction over HTTP multipart upload.
    def test_02_process_tender_endpoint(self):
        # Resolves path to accuracy tender PDF file.
        # Required to open binary stream for file upload.
        tender_pdf = self.dataset_dir / "accuracy_tender.pdf"
        # Opens binary file stream for upload.
        # Required to pass file buffer to HTTP multipart request.
        with open(tender_pdf, "rb") as f:
            # Sends POST request to /api/ai/process-tender with tenderFile parameter.
            # Required to test tender requirement extraction API endpoint.
            response = self.client.post(
                "/api/ai/process-tender",
                files={"tenderFile": ("accuracy_tender.pdf", f, "application/pdf")}
            )
        # Asserts HTTP status code is 200 OK.
        # Required to verify successful tender processing response code.
        self.assertEqual(response.status_code, 200)
        # Parses JSON response dictionary.
        # Required to inspect extracted tender requirements structure.
        data = response.json()
        # Asserts success boolean is True.
        # Required to verify execution success flag.
        self.assertTrue(data.get("success"))
        # Asserts document_name matches uploaded filename.
        # Required to verify document traceability metadata.
        self.assertEqual(data.get("document_name"), "accuracy_tender.pdf")
        # Asserts requirements list is non-empty.
        # Required to confirm that Phase 2 requirements were extracted.
        self.assertGreater(data.get("total_requirements", 0), 0)

    # Test 3: POST /api/ai/process-bidder document processing.
    # Required to verify Phase 1 + Phase 3 bidder fact extraction over HTTP multipart upload.
    def test_03_process_bidder_endpoint(self):
        # Resolves path to accuracy bidder PDF file.
        # Required to open binary stream for batch file upload.
        bidder_pdf = self.dataset_dir / "accuracy_bidder.pdf"
        # Opens binary file stream for upload.
        # Required to pass file buffer to HTTP multipart request.
        with open(bidder_pdf, "rb") as f:
            # Sends POST request to /api/ai/process-bidder with bidderFiles[] parameter.
            # Required to test bidder document intelligence API endpoint.
            response = self.client.post(
                "/api/ai/process-bidder",
                files=[("bidderFiles", ("accuracy_bidder.pdf", f, "application/pdf"))]
            )
        # Asserts HTTP status code is 200 OK.
        # Required to verify successful bidder document processing response code.
        self.assertEqual(response.status_code, 200)
        # Parses JSON response dictionary.
        # Required to inspect extracted bidder facts structure.
        data = response.json()
        # Asserts success boolean is True.
        # Required to verify execution success flag.
        self.assertTrue(data.get("success"))
        # Asserts documents list contains uploaded document name.
        # Required to verify document inventory listing.
        self.assertIn("accuracy_bidder.pdf", data.get("documents", []))
        # Asserts facts list is non-empty.
        # Required to confirm that Phase 3 bidder facts were extracted.
        self.assertGreater(data.get("total_facts", 0), 0)

    # Test 4: POST /api/ai/evaluate compliance verification.
    # Required to verify Phase 4 + Phase 5 evaluation on submitted requirements and facts.
    def test_04_evaluate_endpoint(self):
        # Constructs sample evaluation request payload dictionary.
        # Required to supply requirement criteria and bidder facts for evaluation.
        payload = {
            "requirements": [
                {
                    "requirement_id": "REQ-FIN-01",
                    "category": "FINANCIAL",
                    "description": "Minimum average annual turnover of at least INR 5 Crore",
                    "required_value": 50000000.0,
                    "mandatory": True
                }
            ],
            "facts": [
                {
                    "fact_id": "FACT-001",
                    "category": "FINANCIAL",
                    "field": "annual_turnover",
                    "detected_value": 70000000.0,
                    "source_document": "accuracy_bidder.pdf",
                    "page_number": 1,
                    "source_text": "Average turnover is INR 7 Crore",
                    "is_verified": True
                }
            ]
        }
        # Sends POST request to /api/ai/evaluate with JSON body.
        # Required to test compliance and risk evaluation API endpoint.
        response = self.client.post("/api/ai/evaluate", json=payload)
        # Asserts HTTP status code is 200 OK.
        # Required to verify successful evaluation response code.
        self.assertEqual(response.status_code, 200)
        # Parses JSON response dictionary.
        # Required to inspect compliance decisions and risk metrics.
        data = response.json()
        # Asserts success boolean is True.
        # Required to confirm successful execution flag.
        self.assertTrue(data.get("success"))
        # Asserts compliance dictionary contains evaluation results.
        # Required to verify Phase 4 compliance output presence.
        self.assertIn("compliance", data)
        # Asserts risk dictionary contains risk assessment metrics.
        # Required to verify Phase 5 risk output presence.
        self.assertIn("risk", data)
        self.assertIn("risk_score", data["risk"])
        # Asserts overall_status is present in response dictionary.
        # Required to verify overarching compliance status.
        self.assertIn("overall_status", data)

    # Test 5: POST /api/ai/process-submission end-to-end processing.
    # Required to verify complete submission pipeline (Phase 1 -> Phase 5) over HTTP.
    def test_05_process_submission_endpoint(self):
        # Resolves paths to tender and bidder PDF test files.
        # Required to open binary streams for end-to-end submission upload.
        tender_pdf = self.dataset_dir / "accuracy_tender.pdf"
        bidder_pdf = self.dataset_dir / "accuracy_bidder.pdf"

        # Opens binary streams for both tender and bidder files.
        # Required to submit multiple files in a single submission API call.
        with open(tender_pdf, "rb") as tf, open(bidder_pdf, "rb") as bf:
            # Sends POST request to /api/ai/process-submission with form fields and files.
            # Required to test main end-to-end submission processing API endpoint.
            response = self.client.post(
                "/api/ai/process-submission",
                data={"submissionId": "SUB-TEST-001"},
                files=[
                    ("tenderFile", ("accuracy_tender.pdf", tf, "application/pdf")),
                    ("bidderFiles", ("accuracy_bidder.pdf", bf, "application/pdf"))
                ]
            )
        # Asserts HTTP status code is 200 OK.
        # Required to verify successful submission processing response code.
        self.assertEqual(response.status_code, 200)
        # Parses JSON response dictionary.
        # Required to inspect full submission output structure.
        data = response.json()
        # Asserts success boolean is True.
        # Required to verify execution success flag.
        self.assertTrue(data.get("success"))
        # Asserts submission_id matches submitted form field.
        # Required to verify submission identifier tracking.
        self.assertEqual(data.get("submission_id"), "SUB-TEST-001")
        # Asserts requirements, bidder_facts, compliance, and risk fields are present.
        # Required to confirm presence of all pipeline phase outputs in response.
        self.assertIn("requirements", data)
        self.assertIn("bidder_facts", data)
        self.assertIn("compliance", data)
        self.assertIn("risk", data)
        self.assertIn("risk_score", data["risk"])
        self.assertIn("overall_status", data)

    # Test 6: POST /api/ai/government/ask RAG query.
    # Required to verify Phase 6C + Phase 6D grounded RAG procurement guidance.
    def test_06_government_rag_endpoint(self):
        # Constructs RAG query payload dictionary with the minimum valid threshold.
        # Required to pass question, top_k, and threshold parameters.
        payload = {
            "question": "minimum bidder turnover requirement",
            "top_k": 5,
            "threshold": 0.0
        }
        # Sends POST request to /api/ai/government/ask with JSON payload.
        # Required to test government knowledge RAG query endpoint.
        response = self.client.post("/api/ai/government/ask", json=payload)
        # Asserts HTTP status code is 200 OK.
        # Required to verify successful RAG query response code.
        self.assertEqual(response.status_code, 200)
        # Parses JSON response dictionary.
        # Required to inspect grounded answer and citation sources.
        data = response.json()
        # Asserts status equals "SUCCESS".
        # Required to confirm RAG service execution success status.
        self.assertEqual(data.get("status"), "SUCCESS")
        # Asserts grounding_status equals "GROUNDED".
        # Required to verify that answer is grounded in retrieved evidence.
        self.assertEqual(data.get("grounding_status"), "GROUNDED")
        # Asserts answer text string is non-empty.
        # Required to verify that grounded answer text was generated.
        self.assertTrue(len(data.get("answer", "")) > 0)

    # Test 7: Insufficient evidence RAG query refusal safety check.
    # Required to verify that low-similarity queries return INSUFFICIENT_EVIDENCE without LLM call.
    def test_07_insufficient_evidence_rag_query(self):
        # Constructs unrelated negative query payload with high threshold 0.70.
        # Required to trigger insufficient evidence safety refusal check.
        payload = {
            "question": "Who won the cricket match yesterday?",
            "top_k": 5,
            "threshold": 0.70
        }
        # Sends POST request to /api/ai/government/ask with negative query.
        # Required to test safety refusal behavior for low similarity scores.
        response = self.client.post("/api/ai/government/ask", json=payload)
        # Asserts HTTP status code is 200 OK.
        # Required to verify clean status response code without server error.
        self.assertEqual(response.status_code, 200)
        # Parses JSON response dictionary.
        # Required to inspect refusal status and evidence sources.
        data = response.json()
        # Asserts status equals "INSUFFICIENT_GOVERNMENT_EVIDENCE".
        # Required to confirm safety status code for insufficient evidence.
        self.assertEqual(data.get("status"), "INSUFFICIENT_GOVERNMENT_EVIDENCE")
        # Asserts sources list is empty.
        # Required to verify that no citations are fabricated for ungrounded queries.
        self.assertEqual(len(data.get("sources", [])), 0)

    # Test 8: Invalid file format handling (.txt file upload).
    # Required to verify that non-PDF uploads return clean HTTP 400 error response.
    def test_08_invalid_file_format_handling(self):
        # Creates invalid plain text file stream.
        # Required to simulate uploading a non-PDF document file.
        files = {"tenderFile": ("invalid.txt", b"This is a plain text file, not a PDF.", "text/plain")}
        # Sends POST request to /api/ai/process-tender with text file.
        # Required to test file format validation error handling.
        response = self.client.post("/api/ai/process-tender", files=files)
        # Asserts HTTP status code is 400 Bad Request.
        # Required to verify that invalid file formats are rejected with 400.
        self.assertEqual(response.status_code, 400)
        # Parses JSON error response dictionary.
        # Required to verify structured error response content.
        data = response.json()
        # Asserts error_code equals "UNSUPPORTED_FORMAT".
        # Required to confirm standardized machine-readable error code.
        self.assertEqual(data.get("error_code"), "UNSUPPORTED_FORMAT")

    # Test 9: Missing file upload error handling.
    # Required to verify HTTP 400/422 response when mandatory file field is omitted.
    def test_09_missing_file_upload_handling(self):
        # Sends POST request to /api/ai/process-tender without files parameter.
        # Required to test missing file parameter error handling.
        response = self.client.post("/api/ai/process-tender")
        # Asserts HTTP status code is 400 Bad Request or 422 Unprocessable Entity.
        # Required to verify rejection code for missing file payload.
        self.assertIn(response.status_code, [400, 422])

    # Test 10: LLM failure error handling.
    # Required to verify structured error response when LLM execution fails.
    def test_10_llm_failure_handling(self):
        # Creates single-page PyMuPDF document containing timeout trigger text.
        # Required to force LLM provider to raise mock API timeout exception.
        doc = fitz.open()
        page = doc.new_page()
        page.insert_text((50, 50), "TRIGGER_LLM_TIMEOUT Tender requirement for turnover.")
        pdf_bytes = doc.tobytes()
        doc.close()

        # Uploads generated trigger PDF to process-tender endpoint.
        # Required to test server exception handling during LLM failure.
        files = {"tenderFile": ("trigger_timeout.pdf", pdf_bytes, "application/pdf")}
        response = self.client.post("/api/ai/process-tender", files=files)
        # Asserts HTTP status code is 500 Internal Server Error.
        # Required to verify error response code for internal LLM failure.
        self.assertEqual(response.status_code, 500)
        # Parses JSON error response dictionary.
        # Required to verify structured error payload without stack trace exposure.
        data = response.json()
        # Asserts error_code equals "AI_PROCESSING_ERROR".
        # Required to verify machine-readable error code for processing failure.
        self.assertEqual(data.get("error_code"), "AI_PROCESSING_ERROR")

    # Test 11: Timeout error handling.
    # Required to verify clean error response when RAG service encounters timeout.
    def test_11_timeout_handling(self):
        # Constructs RAG query containing timeout trigger keyword.
        # Required to force Mock RAG LLM to raise connection timeout exception.
        payload = {
            "question": "TRIGGER_LLM_TIMEOUT bidder turnover criteria",
            "top_k": 5,
            "threshold": 0.0
        }
        # Sends POST request to /api/ai/government/ask with trigger query.
        # Required to test timeout error handling in RAG service.
        response = self.client.post("/api/ai/government/ask", json=payload)
        # Asserts HTTP status code is 500 Internal Server Error.
        # Required to verify error status code for RAG timeout exception.
        self.assertEqual(response.status_code, 500)
        # Parses JSON error response dictionary.
        # Required to inspect structured error response fields.
        data = response.json()
        # Asserts error_code equals "RAG_SERVICE_ERROR".
        # Required to verify machine-readable error code for RAG service failure.
        self.assertEqual(data.get("error_code"), "RAG_SERVICE_ERROR")

    # Test 12: Invalid request payload handling (malformed payload).
    # Required to verify HTTP 400 Bad Request response for invalid JSON payload structures.
    def test_12_invalid_request_payload_handling(self):
        # Sends POST request to /api/ai/evaluate with invalid JSON payload (missing required 'requirements').
        # Required to test Pydantic request validation error handler.
        response = self.client.post("/api/ai/evaluate", json={"invalid_key": "sample_data"})
        # Asserts HTTP status code is 400 Bad Request.
        # Required to verify that malformed JSON request bodies are rejected with 400.
        self.assertEqual(response.status_code, 400)
        # Parses JSON error response dictionary.
        # Required to verify structured validation error response content.
        data = response.json()
        # Asserts error_code equals "INVALID_REQUEST_PAYLOAD".
        # Required to confirm machine-readable payload validation error code.
        self.assertEqual(data.get("error_code"), "INVALID_REQUEST_PAYLOAD")


# Main execution block to run API test suite directly from CLI.
# Required to allow python tests/test_api_endpoints.py execution.
if __name__ == "__main__":
    unittest.main()
