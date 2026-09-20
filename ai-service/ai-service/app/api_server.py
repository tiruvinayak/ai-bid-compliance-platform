# Imports os for environment-based service defaults.
import os

# Imports FastAPI class and Request object from FastAPI framework.
# Required to instantiate the main REST API application and handle request objects.
from fastapi import FastAPI, Request, status

# Imports JSONResponse class from FastAPI responses module.
# Required to construct standardized JSON error responses in global exception handlers.
from fastapi.responses import JSONResponse

# Imports CORSMiddleware from FastAPI middleware module.
# Required to enable Cross-Origin Resource Sharing for communication with Spring Boot.
from fastapi.middleware.cors import CORSMiddleware

# Imports RequestValidationError from FastAPI exceptions module.
# Required to catch Pydantic payload validation errors and return clean JSON.
from fastapi.exceptions import RequestValidationError

# Imports HTTPException from Starlette / FastAPI exceptions module.
# Required to catch application HTTP exceptions and format structured outputs.
from starlette.exceptions import HTTPException as StarletteHTTPException

# Imports modular route objects from app.api.routes subpackage.
# Required to include all Phase 7 endpoint handlers in the main FastAPI application.
from app.api.routes import health, tender, bidder, evaluation, submission, government


# Creates and initializes the primary FastAPI application instance.
# Required to serve REST API endpoints on http://localhost:8000.
app = FastAPI(
    title="SIH 2026 Procurement AI Service REST API",
    description="Independent AI Microservice providing Tender Requirement Extraction, Bidder Fact Intelligence, Compliance Verification, Risk Intelligence, and Government RAG APIs.",
    version="1.0.0"
)

# Configures CORS middleware on the FastAPI application instance.
# Required to allow Spring Boot backend and local frontend ports to make cross-origin HTTP requests.
app.add_middleware(
    CORSMiddleware,
    # Wildcard origins cannot be combined with credentials; keep local defaults explicit.
    allow_origins=[origin.strip() for origin in os.getenv(
        "AI_CORS_ALLOWED_ORIGINS",
        "http://localhost:8080,http://localhost:3000,http://localhost:5173,http://localhost:5174,http://localhost:5175"
    ).split(",") if origin.strip()],
    # Permits credentials (cookies, HTTP authorization headers) in CORS requests.
    # Required to support authenticated backend-to-AI-service HTTP calls.
    allow_credentials=True,
    # Specifies allowed HTTP methods (GET, POST, OPTIONS, PUT, DELETE).
    # Required to support REST API standard interaction methods.
    allow_methods=["GET", "POST", "OPTIONS"],
    # Specifies allowed request header fields (Content-Type, Authorization, etc.).
    # Required to permit multipart form uploads and JSON request headers.
    allow_headers=["Accept", "Authorization", "Content-Type"],
)


# Defines global exception handler decorator for Starlette/FastAPI HTTPException.
# Required to intercept HTTP exceptions and format clean, standardized JSON error bodies.
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    # Checks if detail is already a structured dictionary error object.
    # Required to preserve custom error structures formatted inside route handlers.
    if isinstance(exc.detail, dict):
        # Returns JSONResponse wrapping the existing custom detail dictionary.
        # Required to deliver structured error code, message, and diagnostic details.
        return JSONResponse(status_code=exc.status_code, content=exc.detail)

    # Returns standardized ErrorResponse JSON structure for generic HTTP exceptions.
    # Required to ensure consistent JSON error response schema across all endpoints.
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error_code": "HTTP_ERROR",
            "message": str(exc.detail),
            "details": None
        }
    )


# Defines global exception handler decorator for Pydantic RequestValidationError.
# Required to catch payload validation errors and return HTTP 400 with details.
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    validation_details = [
        {
            "location": list(error.get("loc", [])),
            "message": error.get("msg", "Invalid value"),
            "type": error.get("type", "validation_error"),
        }
        for error in exc.errors()
    ]
    # Returns standardized JSON error response for request body validation failures.
    # Required to inform client of invalid request payload parameters cleanly.
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "success": False,
            "error_code": "INVALID_REQUEST_PAYLOAD",
            "message": "Request validation failed. Please verify input fields and payload structure.",
            "details": validation_details
        }
    )


# Defines global fallback exception handler decorator for all unhandled Exception types.
# Required to catch unexpected runtime exceptions without leaking stack traces or secrets.
@app.exception_handler(Exception)
async def global_unhandled_exception_handler(request: Request, exc: Exception):
    # Returns HTTP 500 Internal Server Error with clean, sanitized error JSON.
    # Required to prevent internal server crashes and protect API keys from exposure.
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error_code": "INTERNAL_SERVER_ERROR",
            "message": "An unexpected error occurred during AI processing.",
            "details": None
        }
    )


# Includes health router with prefix /api/ai.
# Required to register GET /api/ai/health endpoint.
app.include_router(health.router, prefix="/api/ai", tags=["Health"])

# Includes tender router with prefix /api/ai.
# Required to register POST /api/ai/process-tender endpoint.
app.include_router(tender.router, prefix="/api/ai", tags=["Tender Intelligence"])

# Includes bidder router with prefix /api/ai.
# Required to register POST /api/ai/process-bidder endpoint.
app.include_router(bidder.router, prefix="/api/ai", tags=["Bidder Intelligence"])

# Includes evaluation router with prefix /api/ai.
# Required to register POST /api/ai/evaluate endpoint.
app.include_router(evaluation.router, prefix="/api/ai", tags=["Compliance Verification"])

# Includes submission router with prefix /api/ai.
# Required to register POST /api/ai/process-submission endpoint.
app.include_router(submission.router, prefix="/api/ai", tags=["Submission Pipeline"])

# Includes government router with prefix /api/ai.
# Required to register POST /api/ai/government/ask endpoint.
app.include_router(government.router, prefix="/api/ai", tags=["Government Knowledge RAG"])
