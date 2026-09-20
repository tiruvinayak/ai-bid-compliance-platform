# Imports APIRouter and HTTPException from FastAPI framework.
# Required to declare REST route handlers and HTTP exception responses.
from fastapi import APIRouter, HTTPException, status

# Imports EvaluationRequest and EvaluationResponse Pydantic schemas.
# Required to enforce payload typing and response structure validation.
from app.api.schemas.api_schemas import EvaluationRequest, EvaluationResponse

# Imports Phase 4 deterministic compliance verification engine.
# Required to evaluate bidder evidence against tender requirements rule-by-rule.
from app.compliance_engine import ComplianceEngine

# Imports Phase 5 risk and conflict intelligence engine.
# Required to identify data conflicts, expired certificates, and high-risk bids.
from app.risk_conflict_engine import RiskConflictEngine

# Instantiates router instance for compliance evaluation endpoints.
# Required to register route definitions with the primary FastAPI server.
router = APIRouter()


# Defines POST route decorator for /api/ai/evaluate endpoint.
# Required to execute Phase 4 + Phase 5 evaluation on submitted requirements and facts.
@router.post("/evaluate", response_model=EvaluationResponse)
async def evaluate_bid(
    # Accepts request payload containing requirements and extracted bidder facts.
    # Required to receive evaluation input data from HTTP API clients.
    payload: EvaluationRequest
):
    # Try block to catch execution errors during evaluation processing.
    # Required to ensure graceful error handling without exposing internal stack traces.
    try:
        # Extracts requirements list from payload dictionary.
        # Required to feed requirement data into Phase 4 compliance engine.
        reqs = payload.requirements
        # Extracts bidder facts list from 'facts' or fallback 'bidder_facts' payload field.
        # Required to support both 'facts' and 'bidder_facts' payload JSON keys.
        facts = payload.facts if payload.facts is not None else (payload.bidder_facts or [])

        # Validates that requirements list is provided and non-empty.
        # Required to return clean HTTP 400 error response for missing requirements.
        if not reqs:
            # Raises HTTP 400 Bad Request exception for empty requirements input.
            # Required to reject invalid evaluation requests before engine execution.
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"success": False, "error_code": "MISSING_REQUIREMENTS", "message": "Requirements list cannot be empty."}
            )

        # Constructs Phase 2 requirements dictionary structure for ComplianceEngine.
        # Required to match the input schema expected by evaluate_bid_compliance().
        p2_input = {"success": True, "requirements": reqs}
        # Constructs Phase 3 bidder facts dictionary structure for ComplianceEngine.
        # Required to match the input schema expected by evaluate_bid_compliance().
        p3_input = {"success": True, "facts": facts}

        # Instantiates Phase 4 compliance engine instance.
        # Required to perform rule-based deterministic compliance verification.
        compliance_engine = ComplianceEngine()
        # Executes Phase 4 compliance evaluation on input requirements and facts.
        # Required to generate transparent, auditable compliance decisions.
        compliance_res = compliance_engine.evaluate_bid_compliance(p2_input, p3_input)

        # Instantiates Phase 5 risk and conflict intelligence engine.
        # Required to analyze compliance results for high-risk situations and conflicts.
        risk_engine = RiskConflictEngine()
        # Executes Phase 5 risk assessment on extracted facts and Phase 4 compliance results.
        # Required to identify evidence conflicts, expired certs, and review priorities.
        risk_res = risk_engine.assess_bid_risk(p3_input, compliance_res)

        # Extracts conflicts list from Phase 5 risk assessment result dictionary.
        # Required to populate conflicts field in final evaluation response.
        conflicts = risk_res.get("conflicts", [])
        # Extracts risk assessment dictionary from Phase 5 output.
        # Required to include risk level metrics and review flags in response.
        # RiskConflictEngine returns the assessment fields at the top level.
        assessment = risk_res

        # Determines overall status string from Phase 4 and Phase 5 evaluations.
        # Required to communicate overarching bid evaluation status to Spring Boot.
        overall_status = compliance_res.get("overall_status", "REVIEW")

        # Returns structured EvaluationResponse model instance.
        # Required to deliver complete Phase 4 + Phase 5 output to calling clients.
        return EvaluationResponse(
            success=True,
            compliance=compliance_res,
            risk=assessment,
            conflicts=conflicts,
            overall_status=overall_status
        )

    # Catches FastAPI HTTPException instances and re-raises them directly.
    # Required to preserve status codes and clean error details from validation.
    except HTTPException:
        raise

    # Catch-all exception block for unhandled evaluation processing errors.
    # Required to convert internal errors into clean HTTP 500 JSON error responses.
    except Exception as e:
        # Raises HTTP 500 Internal Server Error for unhandled evaluation failures.
        # Required to return structured JSON error output to calling backend.
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"success": False, "error_code": "EVALUATION_ERROR", "message": f"Bid evaluation failed: {str(e)}"}
        )
