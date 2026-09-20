# Imports Pydantic BaseModel for defining request and response data schemas.
# Required to enforce payload validation and type safety across REST API endpoints.
from pydantic import BaseModel, Field

# Imports typing utilities for optional and list parameters in API schemas.
# Required to support flexible JSON request structures and default values.
from typing import Any, Dict, List, Optional


# Defines the health check API response model.
# Required to structure the GET /api/ai/health endpoint response expected by Spring Boot.
class HealthResponse(BaseModel):
    # Field holding service health status string ("UP").
    # Required to communicate operational readiness to the calling backend.
    status: str = Field(default="UP", description="Service status indicator")

    # Field holding service identifier string ("ai-service").
    # Required to identify the application component handling health checks.
    service: str = Field(default="ai-service", description="Service identifier name")

    # Field holding service version string ("1.0").
    # Required to provide version tracking for backend API integrations.
    version: str = Field(default="1.0", description="API version string")

    # Field holding Ollama connectivity status.
    # Required to confirm local LLM gateway is reachable and model available.
    ollama: Optional[Dict[str, Any]] = Field(default=None, description="Ollama connectivity and model status")


# Defines the request payload model for Phase 4 + Phase 5 compliance evaluation.
# Required to parse Phase 2 requirements and Phase 3 bidder facts submitted to POST /api/ai/evaluate.
class EvaluationRequest(BaseModel):
    # Field holding extracted tender requirements from Phase 2.
    # Required to pass requirement criteria to the deterministic compliance engine.
    requirements: List[Dict[str, Any]] = Field(..., description="List of tender requirement objects")

    # Field holding extracted bidder facts from Phase 3 (primary key 'facts').
    # Required to supply detected evidence facts for compliance evaluation.
    facts: Optional[List[Dict[str, Any]]] = Field(default=None, description="List of extracted bidder fact objects")

    # Field holding extracted bidder facts (alternative key 'bidder_facts').
    # Required to support backward compatibility with clients using 'bidder_facts'.
    bidder_facts: Optional[List[Dict[str, Any]]] = Field(default=None, description="Alternative key for bidder facts")


# Defines the response model for Phase 4 + Phase 5 evaluation.
# Required to structure compliance decisions, risk assessments, and conflict lists.
class EvaluationResponse(BaseModel):
    # Field indicating overall execution success status.
    # Required to allow calling clients to verify successful evaluation.
    success: bool = Field(default=True, description="Execution success status")

    # Field holding Phase 4 compliance engine summary dictionary.
    # Required to return itemized compliance decisions and requirement statuses.
    compliance: Dict[str, Any] = Field(default_factory=dict, description="Compliance verification results")

    # Field holding Phase 5 risk assessment dictionary.
    # Required to return risk levels, scores, and review priority flags.
    risk: Dict[str, Any] = Field(default_factory=dict, description="Risk assessment summary")

    # Field holding list of detected evidence and fact conflict objects.
    # Required to surface contradictory bidder claims to evaluation officers.
    conflicts: List[Dict[str, Any]] = Field(default_factory=list, description="List of detected fact conflicts")

    # Field holding overall bid compliance status code ("PASS", "FAIL", "REVIEW").
    # Required to convey final recommendation summary to Spring Boot backend.
    overall_status: str = Field(default="REVIEW", description="Overall compliance evaluation status")


# Defines the request payload model for Government Knowledge RAG queries.
# Required to parse natural-language questions submitted to POST /api/ai/government/ask.
class GovernmentAskRequest(BaseModel):
    # Field holding user's natural-language procurement question string.
    # Required to generate query embeddings and perform semantic search.
    question: str = Field(..., min_length=1, max_length=2000, description="Natural language procurement question string")

    # Field specifying maximum number of context chunks to retrieve (default 5).
    # Required to limit retrieval context length for grounded RAG processing.
    top_k: Optional[int] = Field(default=5, ge=1, le=20, description="Maximum context chunks to retrieve")

    # Field specifying minimum grounding similarity threshold cutoff (default 0.15 for Ollama embeddings).
    # Required to enforce evidence grounding and trigger fallback refusal if similarity is low.
    threshold: Optional[float] = Field(default=0.15, ge=0.0, le=1.0, description="Minimum grounding similarity threshold")


# Defines standardized error response model for API failure cases.
# Required to ensure clean, structured JSON error reporting without exposing secrets.
class ErrorResponse(BaseModel):
    # Field indicating execution failure (always False).
    # Required to inform client that the request encountered an error.
    success: bool = Field(default=False, description="Failure indicator boolean")

    # Field holding standardized error classification code string (e.g. 'FILE_VALIDATION_ERROR').
    # Required to allow calling backend services to handle specific error types programmatically.
    error_code: str = Field(..., description="Standardized machine-readable error code")

    # Field holding human-readable error summary message string.
    # Required to provide clear diagnostic explanation of the failure.
    message: str = Field(..., description="User-friendly summary error message")

    # Field holding detailed error diagnostic context string or object.
    # Required to assist developers in debugging issues without exposing environment secrets.
    details: Optional[Any] = Field(default=None, description="Detailed diagnostic context")
