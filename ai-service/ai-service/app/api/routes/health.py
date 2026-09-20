# Imports APIRouter from FastAPI framework.
# Required to declare modular route definitions for health check endpoints.
from fastapi import APIRouter

# Imports HealthResponse schema for response typing.
# Required to enforce structured JSON output for the health endpoint.
from app.api.schemas.api_schemas import HealthResponse

# Imports OllamaLLMProvider for health check.
# Required to verify Ollama server connectivity and model availability.
from app.llm_client import OllamaLLMProvider

# Instantiates router instance for health endpoints.
# Required to register route definitions with the main FastAPI application.
router = APIRouter()


# Defines GET route decorator for /api/ai/health endpoint.
# Required to expose the health check endpoint for Spring Boot liveness probes.
@router.get("/health", response_model=HealthResponse)
async def check_health():
    # Checks Ollama connectivity and model availability.
    # Required to confirm local LLM gateway is reachable for AI processing.
    ollama_status = {"connected": False, "model_available": False, "model": "unknown", "base_url": "http://localhost:11434"}
    try:
        provider = OllamaLLMProvider(model="qwen2.5:3b", base_url="http://localhost:11434")
        ollama_status["connected"] = True
        ollama_status["model_available"] = provider.health_check()
        ollama_status["model"] = "qwen2.5:3b"
    except Exception as e:
        ollama_status["error"] = str(e)

    # Constructs and returns HealthResponse object with UP status.
    # Required to confirm that the Python AI REST service is running and responsive.
    return HealthResponse(
        status="UP",
        service="ai-service",
        version="1.0",
        ollama=ollama_status
    )
