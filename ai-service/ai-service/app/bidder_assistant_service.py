"""
===============================================================================
MODULE: app/bidder_assistant_service.py
===============================================================================
PURPOSE:
    Core service implementation for Phase 3 (Bidder AI Assistant).
    Handles chat endpoint with grounded, tender-aware responses.

WHAT IT DOES:
    - Accepts natural-language questions from bidders about their tender/bid.
    - Retrieves relevant context from tender requirements, bidder facts,
      compliance results, preliminary verification, and evidence.
    - Builds grounded prompt with all available context.
    - Calls configured LLM (Ollama/Gemini/OpenAI/Mock) to generate grounded response.
    - Performs citation validation to prevent hallucination.
    - Returns structured response with answer, citations, and grounding status.

HOW IT FITS INTO THE PIPELINE:
    Bidder Question -> Context Retrieval -> Grounded Prompt -> LLM -> Citation Validation -> Grounded Response
===============================================================================
"""

# standard library imports
import json
import re
from typing import Any, Dict, List, Optional, Union

# App imports
from app.llm_client import BaseLLMProvider, get_llm_client
from app.prompts.bidder_assistant_prompt import BIDDER_ASSISTANT_SYSTEM_PROMPT, build_assistant_prompt
from app.schemas.bidder_assistant import BidderAssistantRequest, BidderAssistantResponse

# Set up logging
import logging
logger = logging.getLogger("BidderAssistant")


class BidderAssistantService:
    """
    Service orchestrator for the Bidder AI Assistant.
    """

    def __init__(
        self,
        llm_provider: Optional[BaseLLMProvider] = None,
        max_context_chunks: int = 8,
        min_grounding_similarity: float = 0.15
    ):
        """
        Initializes BidderAssistantService with injected or default LLM provider.
        """
        self.llm_provider = llm_provider or get_llm_client()
        self.max_context_chunks = max_context_chunks
        self.min_grounding_similarity = min_grounding_similarity

    def chat(self, request: BidderAssistantRequest, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Main entry point for the bidder assistant chat.
        
        Args:
            request: BidderAssistantRequest with question and optional chat_history
            context: Dictionary containing all tender/bid context data
            
        Returns:
            Dict[str, Any]: Serialized BidderAssistantResponse dictionary
        """
        question = request.question.strip()
        chat_history = request.chat_history or []
        # Normalize pydantic message models to plain dicts for prompt formatting.
        chat_history = [
            m.model_dump() if hasattr(m, "model_dump") else (m if isinstance(m, dict) else dict(m))
            for m in chat_history
        ]

        if not question:
            return BidderAssistantResponse(
                answer="Please provide a question about your tender or submission.",
                citations=[],
                grounding_status="VALIDATION_ERROR"
            ).to_dict()

        # Build grounded prompt with all available context
        prompt = build_assistant_prompt(
            question=question,
            tender_context=context.get("tender", {}),
            bid_context=context.get("bid", {}),
            requirements=context.get("requirements", []),
            bidder_facts=context.get("bidder_facts", []),
            compliance_results=context.get("compliance", []),
            preliminary_verification=context.get("preliminary_verification", []),
            evidence=context.get("evidence", []),
            risk_conflicts=context.get("risk_conflicts", []),
            chat_history=chat_history
        )

        # Call LLM provider
        try:
            llm_raw_output = self.llm_provider.generate_json(
                prompt=prompt,
                system_prompt=BIDDER_ASSISTANT_SYSTEM_PROMPT
            )
        except Exception as e:
            logger.error(f"LLM call failed: {e}")
            return BidderAssistantResponse(
                answer="Failed to generate response from AI service.",
                citations=[],
                grounding_status="GENERATION_FAILED",
                error_message=f"LLM API execution error: {str(e)}"
            ).to_dict()

        # Parse LLM JSON response
        try:
            clean_output = llm_raw_output.strip()
            if clean_output.startswith("```"):
                clean_output = re.sub(r"^```(?:json)?\s*", "", clean_output)
                clean_output = re.sub(r"\s*```$", "", clean_output)

            llm_data = json.loads(clean_output)
        except Exception as e:
            logger.error(f"Failed to decode LLM JSON output: {e}. Raw: '{llm_raw_output[:200]}...'")
            return BidderAssistantResponse(
                answer="AI service generated an invalid response format.",
                citations=[],
                grounding_status="GENERATION_FAILED",
                error_message=f"JSON decode failure: {str(e)}"
            ).to_dict()

        raw_answer = (llm_data.get("answer") or llm_data.get("response") or "").strip()
        raw_grounding = llm_data.get("grounding_status", "GROUNDED")
        raw_citations = llm_data.get("citations", [])

        # Normalize LLM citation shapes: small local models sometimes emit
        # ["type", "id", page] arrays, "SOURCE:" strings, or objects with extra ":" noise.
        normalized_citations: List[Dict[str, Any]] = []
        for cit in raw_citations or []:
            if isinstance(cit, dict):
                if "type" in cit and "id" in cit:
                    cit["type"] = str(cit["type"]).lstrip(":").strip().lower()
                    normalized_citations.append(cit)
            elif isinstance(cit, (list, tuple)) and len(cit) >= 2:
                page = cit[2] if len(cit) > 2 and isinstance(cit[2], int) else None
                normalized_citations.append({
                    "type": str(cit[0]).lstrip(":").strip().lower(),
                    "id": str(cit[1]).strip(),
                    "page": page
                })
            elif isinstance(cit, str):
                m = re.search(
                    r"(?:SOURCE:\s*)?([A-Za-z]+)\s*,\s*([A-Za-z0-9_.:-]+)(?:\s*,\s*p\.?\s*(\d+))?",
                    cit, re.IGNORECASE
                )
                if m:
                    normalized_citations.append({
                        "type": m.group(1).lower(),
                        "id": m.group(2),
                        "page": int(m.group(3)) if m.group(3) else None
                    })
        raw_citations = normalized_citations

        if not raw_answer:
            logger.error("LLM returned no answer field. Raw keys: %s", list(llm_data.keys()))
            return BidderAssistantResponse(
                answer="The assistant could not generate an answer for this question. Please try rephrasing.",
                citations=[],
                grounding_status="GENERATION_FAILED",
                error_message="LLM response did not contain a usable answer."
            ).to_dict()

        # Validate citations against available context
        validated_citations = self._validate_citations(
            raw_citations,
            context.get("requirements", []),
            context.get("bidder_facts", []),
            context.get("compliance", []),
            context.get("preliminary_verification", []),
            context.get("evidence", []),
            context.get("risk_conflicts", [])
        )

        # Determine final grounding status
        grounding_status = raw_grounding
        if raw_grounding == "GROUNDED" and not validated_citations:
            grounding_status = "INSUFFICIENT_EVIDENCE"

        return BidderAssistantResponse(
            answer=raw_answer,
            citations=validated_citations,
            grounding_status=grounding_status
        ).to_dict()

    def _validate_citations(
        self,
        citations: List[Dict[str, Any]],
        requirements: List[Dict[str, Any]],
        bidder_facts: List[Dict[str, Any]],
        compliance: List[Dict[str, Any]],
        preliminary_verification: List[Dict[str, Any]],
        evidence: List[Dict[str, Any]],
        risk_conflicts: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Validates that all cited sources exist in the provided context.
        Tolerates small-model citation schema drift (e.g. [":tender:req-001","R-01"])
        by normalizing types and matching structured IDs fuzzily, while still
        rejecting any citation that cannot be grounded in the actual context.
        """
        KNOWN_TYPES = {"requirement", "fact", "compliance", "preliminary", "evidence", "risk", "conflict"}

        def build_lookup(ids) -> Dict[str, str]:
            lookup: Dict[str, str] = {}
            for identifier in ids:
                text = str(identifier or "").strip()
                if not text or text.lower() in {"none", "null"}:
                    continue
                lookup.setdefault(text.lower(), text)
                m = re.search(r"(\d+)$", text.lower())
                if m:
                    try:
                        lookup.setdefault(str(int(m.group(1))), text)
                    except ValueError:
                        pass
            return lookup

        req_ids = {str(r.get("requirement_id") or r.get("id", "")).strip() for r in requirements}
        fact_ids = {str(f.get("fact_id", "")).strip() for f in bidder_facts}
        comp_req_ids = {str(c.get("requirement_id", "")).strip() for c in compliance}
        prelim_types = {str(p.get("checkType") or p.get("check_type", "")).strip() for p in preliminary_verification}
        evidence_req_ids = {str(e.get("requirementId") or e.get("requirement_id", "")).strip() for e in evidence}
        risk_types = {str(r.get("risk_type") or r.get("type", "")).strip() for r in risk_conflicts}

        req_lookup = build_lookup(req_ids)
        fact_lookup = build_lookup(fact_ids)
        comp_lookup = build_lookup(comp_req_ids)
        ev_lookup = build_lookup(evidence_req_ids)
        prelim_lookup = {t.lower(): t for t in prelim_types if t}
        risk_lookup = {t.lower(): t for t in risk_types if t}

        def match_structured(cit_id: str, type_raw: str, lookup: Dict[str, str], prefix: str) -> Optional[str]:
            direct = lookup.get(str(cit_id).strip().lower())
            if direct:
                return direct
            blob = f"{type_raw} {cit_id}"
            for m in re.finditer(rf"{prefix}[-_:\s]*0*(\d+)", blob, re.IGNORECASE):
                found = lookup.get(str(int(m.group(1))))
                if found:
                    return found
            m = re.fullmatch(rf"{prefix[0]}[-_]?0*(\d+)", str(cit_id).strip(), re.IGNORECASE)
            if m:
                return lookup.get(str(int(m.group(1))))
            return None

        valid_citations: List[Dict[str, Any]] = []
        for cit in citations:
            if not isinstance(cit, dict):
                logger.warning(f"Non-dict citation filtered out: {cit}")
                continue
            type_raw = str(cit.get("type", ""))
            cit_type = type_raw.lstrip(":").lower().strip()
            cit_id = str(cit.get("id", "")).strip()
            cit_page = cit.get("page")

            # Infer the source family when the model mangles the type field.
            if cit_type not in KNOWN_TYPES:
                blob = f"{cit_type} {cit_id}".lower()
                if "fact" in blob:
                    cit_type = "fact"
                elif re.search(r"req[-_:\s]*\d", blob) or re.fullmatch(r"r[-_]?\d+", cit_id.lower() or "x"):
                    cit_type = "requirement"
                elif "comp" in blob:
                    cit_type = "compliance"
                elif "prelim" in blob:
                    cit_type = "preliminary"
                elif "evidence" in blob:
                    cit_type = "evidence"
                elif "conf" in blob:
                    cit_type = "conflict"
                elif "risk" in blob:
                    cit_type = "risk"
                elif re.search(r"\d", cit_id):
                    cit_type = "requirement" if req_lookup else cit_type

            resolved_id: Optional[str] = None
            if cit_type == "requirement":
                resolved_id = match_structured(cit_id, type_raw, req_lookup, "req")
                resolved_type = "requirement"
            elif cit_type == "compliance":
                resolved_id = match_structured(cit_id, type_raw, comp_lookup, "req")
                resolved_type = "compliance"
            elif cit_type == "evidence":
                resolved_id = match_structured(cit_id, type_raw, ev_lookup, "req")
                resolved_type = "evidence"
            elif cit_type == "fact":
                resolved_id = match_structured(cit_id, type_raw, fact_lookup, "fact")
                resolved_type = "fact"
            elif cit_type == "preliminary":
                resolved_id = prelim_lookup.get(cit_id.lower())
                resolved_type = "preliminary"
            elif cit_type in ("risk", "conflict"):
                resolved_id = risk_lookup.get(cit_id.lower())
                resolved_type = cit_type
            else:
                resolved_type = cit_type

            if resolved_id:
                valid_citations.append({
                    "type": resolved_type,
                    "id": resolved_id,
                    "page": cit_page
                })
            else:
                logger.warning(f"Invalid citation filtered out: {cit}")

        return valid_citations


def get_bidder_assistant_service(
    force_mock: bool = False
) -> BidderAssistantService:
    """
    Factory function to instantiate BidderAssistantService.
    """
    from app.llm_client import get_llm_client
    llm = get_llm_client(force_mock=force_mock)
    return BidderAssistantService(llm_provider=llm)