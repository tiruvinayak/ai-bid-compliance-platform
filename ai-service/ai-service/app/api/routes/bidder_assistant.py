# Imports APIRouter and HTTPException from FastAPI framework.
# Required to declare REST route handlers and HTTP error exception handling.
from fastapi import APIRouter, HTTPException, status

# Imports BidderAssistantRequest schema for request payload typing.
# Required to enforce validation on incoming bidder assistant chat requests.
from app.schemas.bidder_assistant import BidderAssistantRequest

# Imports Phase 3 Bidder Assistant service class.
# Required to execute grounded chat with context retrieval and citation validation.
from app.bidder_assistant_service import get_bidder_assistant_service

# Instantiates router instance for bidder assistant endpoints.
# Required to register bidder assistant routes with the FastAPI application server.
router = APIRouter()


# Defines POST route decorator for /api/ai/bidder-assistant/chat endpoint.
# Required to answer bidder questions using grounded tender/bid context.
@router.post("/bidder-assistant/chat")
async def bidder_assistant_chat(
    # Accepts request payload model holding question and optional chat history.
    # Required to receive natural language query parameters from HTTP API clients.
    payload: BidderAssistantRequest
):
    # Try block wrapping bidder assistant service execution.
    # Required to catch and handle retrieval or generation exceptions gracefully.
    try:
        # Extracts question string from request payload model.
        # Required to pass query text to BidderAssistantService.
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

        # Extracts chat history from payload (defaults to empty list).
        # Required to provide conversation context for multi-turn conversations.
        chat_history = payload.chat_history or []

        # Extracts enriched tender/bid context provided by the Spring Boot backend.
        # Required for grounded, citation-backed answers (hallucination protection).
        context = payload.context
        if not context:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "success": False,
                    "error_code": "CONTEXT_REQUIRED",
                    "message": "Enriched tender/bid context is required. This endpoint is designed to be called by the Spring Boot backend which provides the full context."
                }
            )

        # Instantiates Phase 3 Bidder Assistant service.
        # Required to execute grounded chat with context retrieval and citation validation.
        assistant_service = get_bidder_assistant_service()

        # Executes grounded chat with the provided context.
        # Required to generate a citation-backed answer from local context only.
        result = assistant_service.chat(payload, context)

        # Returns structured assistant response dictionary.
        # Required to deliver answer, validated citations, and grounding status to client.
        return result

    # Catches FastAPI HTTPException instances and re-raises them directly.
    # Required to preserve status codes and error messages from request validation.
    except HTTPException:
        raise

    # Catch-all exception block for unexpected bidder assistant errors.
    # Required to convert unhandled exceptions into clean HTTP 500 JSON error responses.
    except Exception as e:
        # Raises HTTP 500 Internal Server Error for unhandled assistant execution failures.
        # Required to inform client of server-side failure without exposing stack traces.
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"success": False, "error_code": "ASSISTANT_SERVICE_ERROR", "message": f"Bidder assistant service failed: {str(e)}"}
        )