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
            # Truncated/malformed output is usually an over-long answer hitting the
            # token cap mid-JSON. Retry once with an explicit short-answer nudge.
            llm_data = self._generate_parsed(
                prompt,
                "\n\nREMINDER: Your previous reply exceeded the length limit and was rejected."
                " Reply with a SHORT answer (under 120 words) as a valid JSON object."
            )
            if not llm_data:
                return BidderAssistantResponse(
                    answer="AI service generated an invalid response format.",
                    citations=[],
                    grounding_status="GENERATION_FAILED",
                    error_message=f"JSON decode failure: {str(e)}"
                ).to_dict()

        raw_answer = (llm_data.get("answer") or llm_data.get("response") or "").strip()
        raw_grounding = llm_data.get("grounding_status", "GROUNDED")
        raw_citations = self._normalize_citation_shapes(llm_data.get("citations", []))

        # Small models often write [SOURCE: ...] tags in the answer prose while
        # returning an empty citations array. Merge those tags into citations so
        # grounding can be proven, and strip them from the displayed answer.
        raw_answer, raw_citations = self._merge_inline_source_tags(raw_answer, raw_citations)

        if not raw_answer:
            logger.error("LLM returned no answer field. Raw keys: %s", list(llm_data.keys()))
            return BidderAssistantResponse(
                answer="The assistant could not generate an answer for this question. Please try rephrasing.",
                citations=[],
                grounding_status="GENERATION_FAILED",
                error_message="LLM response did not contain a usable answer."
            ).to_dict()

        validation_args = (
            context.get("requirements", []),
            context.get("bidder_facts", []),
            context.get("compliance", []),
            context.get("preliminary_verification", []),
            context.get("evidence", []),
            context.get("risk_conflicts", [])
        )

        # Validate citations against available context
        validated_citations = self._validate_citations(raw_citations, *validation_args)

        # Determine final grounding status
        grounding_status = raw_grounding
        if raw_grounding == "GROUNDED" and not validated_citations:
            # One nudged retry: with temperature 0 an identical prompt would return
            # the same completion, so the nudge must change the prompt. Only used
            # when the model claims GROUNDED but produced no usable citations;
            # explicit INSUFFICIENT answers (refusals) are returned immediately.
            retry_data = self._retry_for_citations(prompt)
            if retry_data:
                retry_answer = (retry_data.get("answer") or retry_data.get("response") or "").strip()
                retry_citations = self._normalize_citation_shapes(retry_data.get("citations", []))
                retry_answer, retry_citations = self._merge_inline_source_tags(retry_answer, retry_citations)
                retry_validated = self._validate_citations(retry_citations, *validation_args)
                if retry_answer and retry_validated:
                    raw_answer = retry_answer
                    validated_citations = retry_validated
                    grounding_status = "GROUNDED"
            if grounding_status == "GROUNDED" and not validated_citations:
                grounding_status = "INSUFFICIENT_EVIDENCE"

        # Enforce the refusal contract: an answer that explicitly says the context
        # has no answer can never be GROUNDED, and INSUFFICIENT answers carry no citations.
        refusal_markers = (
            "do not include any information",
            "could not find supporting evidence",
            "unrelated to the tender",
        )
        if grounding_status == "GROUNDED" and any(m in raw_answer.lower() for m in refusal_markers):
            grounding_status = "INSUFFICIENT_EVIDENCE"
        if grounding_status == "INSUFFICIENT_EVIDENCE":
            validated_citations = []

        return BidderAssistantResponse(
            answer=raw_answer,
            citations=validated_citations,
            grounding_status=grounding_status
        ).to_dict()

    @staticmethod
    def _normalize_citation_shapes(raw_citations: Any) -> List[Dict[str, Any]]:
        """
        Normalizes LLM citation shapes: small local models sometimes emit
        ["type", "id", page] arrays, "SOURCE:" strings, or objects with extra ":" noise.
        """
        normalized: List[Dict[str, Any]] = []
        for cit in raw_citations or []:
            if isinstance(cit, dict):
                if "type" in cit and "id" in cit:
                    cit["type"] = str(cit["type"]).lstrip(":").strip().lower()
                    normalized.append(cit)
            elif isinstance(cit, (list, tuple)) and len(cit) >= 2:
                page = cit[2] if len(cit) > 2 and isinstance(cit[2], int) else None
                normalized.append({
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
                    normalized.append({
                        "type": m.group(1).lower(),
                        "id": m.group(2),
                        "page": int(m.group(3)) if m.group(3) else None
                    })
        return normalized

    @staticmethod
    def _merge_inline_source_tags(answer: str, citations: List[Dict[str, Any]]) -> tuple:
        """
        Extracts [SOURCE: type, id, p.N] tags from the answer prose into the
        citations list (validated later against the real context) and removes
        them from the answer text so fabricated inline page numbers are never
        displayed to the user.
        """
        if not isinstance(citations, list):
            citations = []
        tags = re.findall(r"\[SOURCE:\s*([^\]]+)\]", answer or "")
        for tag in tags:
            m = re.search(
                r"([A-Za-z]+)\s*,\s*([A-Za-z0-9_.:\-]+)(?:\s*,\s*p\.?\s*(\d+))?",
                tag, re.IGNORECASE
            )
            if m:
                citations.append({
                    "type": m.group(1).lower(),
                    "id": m.group(2),
                    "page": int(m.group(3)) if m.group(3) else None
                })
        if tags:
            answer = re.sub(r"\s*\[SOURCE:\s*[^\]]+\]", "", answer or "")
            answer = re.sub(r"\s{2,}", " ", answer).strip()
        return answer, citations

    def _retry_for_citations(self, prompt: str) -> Optional[Dict[str, Any]]:
        """
        Performs a single nudged re-generation when the model claims GROUNDED
        but returned no citations. Returns parsed LLM JSON or None.
        """
        return self._generate_parsed(
            prompt,
            "\n\nREMINDER: Populate the \"citations\" JSON array with every context ID you used"
            " (for example {\"type\": \"fact\", \"id\": \"FACT-001\", \"page\": 1})."
            " An empty citations array is rejected."
        )

    def _generate_parsed(self, prompt: str, nudge: str) -> Optional[Dict[str, Any]]:
        """
        Re-generates with an extra nudge appended to the prompt (temperature 0
        means an identical prompt would return the identical completion) and
        parses the JSON. Returns dict or None on any failure.
        """
        try:
            raw_output = self.llm_provider.generate_json(
                prompt=prompt + nudge,
                system_prompt=BIDDER_ASSISTANT_SYSTEM_PROMPT
            )
            clean_output = raw_output.strip()
            if clean_output.startswith("```"):
                clean_output = re.sub(r"^```(?:json)?\s*", "", clean_output)
                clean_output = re.sub(r"\s*```$", "", clean_output)
            data = json.loads(clean_output)
            return data if isinstance(data, dict) else None
        except Exception as e:
            logger.warning(f"Nudged LLM retry failed: {e}")
            return None

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

        # Authoritative page numbers come from the context records only.
        # Small models sometimes invent page numbers, so the page reported by
        # the LLM is never trusted — only the page stored with the real source.
        def _page_of(value: Any) -> Optional[int]:
            return value if isinstance(value, int) and not isinstance(value, bool) else None

        req_pages = {
            str(r.get("requirement_id") or r.get("id", "")).strip(): _page_of(r.get("page_number"))
            for r in requirements
        }
        fact_pages = {
            str(f.get("fact_id", "")).strip(): _page_of(f.get("page_number"))
            for f in bidder_facts
        }
        ev_pages = {
            str(e.get("requirementId") or e.get("requirement_id", "")).strip():
                _page_of(e.get("page_number") or e.get("pageNumber"))
            for e in evidence
        }

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
        seen_keys = set()
        for cit in citations:
            if not isinstance(cit, dict):
                logger.warning(f"Non-dict citation filtered out: {cit}")
                continue
            type_raw = str(cit.get("type", ""))
            cit_type = type_raw.lstrip(":").lower().strip()
            cit_id = str(cit.get("id", "")).strip()

            # Swapped/mangled fields: the model sometimes puts the source ID in the
            # type field (e.g. {"type": "fact-abc-001", "id": "R-001"}) or puts a
            # risk/preliminary category name in the type field. Resolve from the
            # authoritative lookups before the family inference below.
            if cit_type not in KNOWN_TYPES:
                swapped_key = cit_type
                if swapped_key in prelim_lookup:
                    cit_type, cit_id = "preliminary", prelim_lookup[swapped_key]
                elif swapped_key in risk_lookup:
                    cit_type, cit_id = "risk", risk_lookup[swapped_key]
                else:
                    for family, lookup in (
                        ("fact", fact_lookup),
                        ("requirement", req_lookup),
                        ("compliance", comp_lookup),
                        ("evidence", ev_lookup),
                    ):
                        direct = lookup.get(swapped_key)
                        if direct:
                            cit_type, cit_id = family, direct
                            break

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
                dedupe_key = (resolved_type, resolved_id)
                if dedupe_key in seen_keys:
                    continue
                seen_keys.add(dedupe_key)
                if resolved_type == "requirement":
                    authoritative_page = req_pages.get(resolved_id)
                elif resolved_type == "fact":
                    authoritative_page = fact_pages.get(resolved_id)
                elif resolved_type == "evidence":
                    authoritative_page = ev_pages.get(resolved_id)
                else:
                    authoritative_page = None
                valid_citations.append({
                    "type": resolved_type,
                    "id": resolved_id,
                    "page": authoritative_page
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