# Imports APIRouter and HTTPException from FastAPI framework.
# Required to declare REST route handlers and HTTP error exception handling.
from fastapi import APIRouter, HTTPException, status

# Imports GovernmentAskRequest schema for request payload typing.
# Required to enforce validation on incoming government RAG queries.
from app.api.schemas.api_schemas import GovernmentAskRequest

# Imports Phase 6D Grounded RAG service class.
# Required to execute semantic retrieval and grounded AI answer generation.
from app.government_rag_service import GovernmentRAGService

# Instantiates router instance for government RAG endpoints.
# Required to register government routes with the FastAPI application server.
router = APIRouter()


# Defines POST route decorator for /api/ai/government/ask endpoint.
# Required to answer procurement questions using grounded Phase 6C + 6D guidance.
@router.post("/government/ask")
async def ask_government_knowledge(
    # Accepts request payload model holding question string, top_k, and threshold.
    # Required to receive natural language query parameters from HTTP API clients.
    payload: GovernmentAskRequest
):
    # Try block wrapping government RAG service execution.
    # Required to catch and handle retrieval or generation exceptions gracefully.
    try:
        # Extracts question string from request payload model.
        # Required to pass query text to GovernmentRAGService.
        question = payload.question
        # Validates that question string is non-null and contains non-whitespace text.
        # Required to return clean HTTP 400 error response for empty query input.
        if not question or not question.strip():
            # Raises HTTP 400 Bad Request exception for empty question string.
            # Required to reject invalid query requests before service execution.
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"success": False, "error_code": "EMPTY_QUESTION", "message": "Question string cannot be empty."}
            )

        # Extracts top_k parameter value from payload (defaults to 5).
        # Required to specify maximum retrieval context chunks limit.
        top_k = payload.top_k if payload.top_k is not None else 5
        # Extracts similarity threshold parameter value from payload (defaults to 0.15 for Ollama embeddings).
        # Required to enforce grounding similarity threshold cutoff.
        threshold = payload.threshold if payload.threshold is not None else 0.15

        # Instantiates Phase 6D Grounded RAG service.
        # Required to execute semantic search retrieval and grounded answer generation.
        rag_service = GovernmentRAGService()
        # Calls ask_government_knowledge() method on RAG service.
        # Required to perform Retrieve-First RAG processing with grounding checks.
        response = rag_service.ask_government_knowledge(
            query=question.strip(),
            top_k=top_k,
            min_similarity=threshold
        )

        # Checks if RAG response status indicates an unrecoverable server execution error.
        # Required to return HTTP 500 for generation or citation validation errors.
        if response.get("status") in ["RETRIEVAL_FAILED", "GENERATION_FAILED", "CITATION_VALIDATION_ERROR"]:
            # Raises HTTP 500 Internal Server Error for RAG service failure.
            # Required to signal execution exception to calling HTTP client.
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={"success": False, "error_code": "RAG_SERVICE_ERROR", "message": response.get("answer") or response.get("error_message")}
            )

        # Returns structured RAG response dictionary.
        # Required to deliver complete grounded answer and citation sources to client.
        return response

    # Catches FastAPI HTTPException instances and re-raises them directly.
    # Required to preserve status codes and error messages from request validation.
    except HTTPException:
        raise

    # Catch-all exception block for unexpected government RAG errors.
    # Required to convert unhandled exceptions into clean HTTP 500 JSON error responses.
    except Exception as e:
        # Raises HTTP 500 Internal Server Error for unhandled RAG execution failures.
        # Required to inform client of server-side failure without exposing stack traces.
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"success": False, "error_code": "RAG_SERVICE_ERROR", "message": f"Government RAG service failed: {str(e)}"}
        )
