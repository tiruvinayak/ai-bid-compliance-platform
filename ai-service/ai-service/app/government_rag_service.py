"""
===============================================================================
MODULE: app/government_rag_service.py
===============================================================================
PURPOSE:
    Core service implementation for Phase 6D (Grounded RAG + Explainable Government Guidance).

WHAT IT DOES:
    - Accepts natural-language procurement questions or tender requirement texts.
    - Reuses Phase 6C GovernmentRetrievalService to fetch semantically relevant government knowledge chunks.
    - Applies insufficient evidence safety checks: if no chunks pass the min_similarity threshold,
      DOES NOT call the LLM, returning status="INSUFFICIENT_GOVERNMENT_EVIDENCE".
    - Builds grounded prompts with prompt injection defenses treating document text as untrusted data.
    - Calls configured LLM (GeminiLLMProvider, OpenAILLMProvider, or MockRAGLLM).
    - Parses structured LLM JSON responses and performs strict citation validation.
    - Binds official application metadata (Document, Page, Section, Similarity, Quote) to citations.
    - Returns structured GovernmentRAGResponse.

WHY WE NEED IT:
    Ensures that government procurement AI explanations are 100% grounded in verified official text,
    preventing hallucination of legal rules, circulars, page numbers, or legal conclusions.

HOW IT FITS INTO THE PIPELINE:
    Question -> Phase 6C Semantic Search -> Grounded Prompt -> LLM -> Citation Validation -> Grounded RAG Response
===============================================================================
"""

# standard library imports
import json
import re
from typing import Any, Dict, List, Optional, Union

# App imports
from app.government_retrieval_service import GovernmentRetrievalService
from app.llm_client import BaseLLMProvider, MockLLMProvider, get_llm_client
from app.prompts.government_rag_prompt import (
    GOVERNMENT_RAG_SYSTEM_PROMPT,
    build_grounded_rag_prompt,
)
from app.schemas.government_rag import (
    GovernmentRAGResponse,
    GovernmentRAGSource,
)


class MockRAGLLM(BaseLLMProvider):
    """
    Deterministic Mock LLM Provider for Phase 6D unit testing.

    WHAT IT DOES:
        Simulates LLM response generation for RAG prompts without requiring live Gemini API access.

    WHY WE NEED IT:
        Enables fast, isolated, deterministic unit testing of RAG pipelines, citation validation,
        prompt injection defense, and error handling.
    """

    def generate_json(self, prompt: str, system_prompt: str) -> str:
        """Generates deterministic mock JSON response based on prompt contents."""

        # Test trigger: LLM Timeout / API failure simulation
        if "TRIGGER_LLM_TIMEOUT" in prompt:
            raise RuntimeError("Network Timeout: Connection lost to Gemini API Endpoint.")

        # Test trigger: Malformed JSON output
        if "TRIGGER_MALFORMED_JSON" in prompt:
            return "THIS IS INVALID NON-JSON TEXT { {{ malformed JSON... }}}"

        # Test trigger: Hallucinated Chunk ID citation
        if "TRIGGER_UNKNOWN_CITATION" in prompt:
            return json.dumps({
                "answer": "The bidder must meet statutory criteria as per Rule 999.",
                "grounding_status": "GROUNDED",
                "source_chunk_ids": ["GOV-999-FAKE-CHUNK"]
            })

        # Test trigger: Prompt Injection text in retrieved document
        if "Ignore previous instructions" in prompt:
            return json.dumps({
                "answer": "The retrieved document specifies statutory eligibility criteria under Rule 144.",
                "grounding_status": "GROUNDED",
                "source_chunk_ids": ["GOV-001-CH-002"]
            })

        # Default Mock parsing: Extract chunk IDs present in prompt
        chunk_ids = re.findall(r"Chunk ID:\s+([^\s\n]+)", prompt)
        valid_chunk_ids = list(dict.fromkeys(chunk_ids))  # Deduplicate chunk IDs

        if not valid_chunk_ids:
            return json.dumps({
                "answer": "Insufficient government evidence was retrieved to answer this question.",
                "grounding_status": "INSUFFICIENT_EVIDENCE",
                "source_chunk_ids": []
            })

        return json.dumps({
            "answer": "The retrieved government guidance states that bidders must satisfy the applicable statutory eligibility and submission criteria specified in General Financial Rules.",
            "grounding_status": "GROUNDED",
            "source_chunk_ids": valid_chunk_ids[:2]
        })


class GovernmentRAGService:
    """
    Service orchestrator for Grounded RAG + Explainable Government Guidance.
    """

    def __init__(
        self,
        retrieval_service: Optional[GovernmentRetrievalService] = None,
        llm_provider: Optional[BaseLLMProvider] = None,
        rag_min_similarity: float = 0.20,
        max_context_chunks: int = 5
    ):
        """
        Initializes GovernmentRAGService with injected or default services.
        """
        self.retrieval_service = retrieval_service or GovernmentRetrievalService()
        provided_llm = llm_provider or get_llm_client()

        # If generic MockLLMProvider is used, adapt to MockRAGLLM for RAG schema output
        if isinstance(provided_llm, MockLLMProvider):
            self.llm_provider = MockRAGLLM()
        else:
            self.llm_provider = provided_llm

        self.rag_min_similarity = rag_min_similarity
        self.max_context_chunks = max_context_chunks

    def ask_government_knowledge(
        self,
        query: str,
        top_k: Optional[int] = None,
        min_similarity: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Main entry point for grounded government guidance questions.

        Args:
            query (str): User procurement question or requirement text.
            top_k (int, optional): Maximum retrieval chunks to fetch. Defaults to self.max_context_chunks.
            min_similarity (float, optional): Grounding similarity threshold cutoff.

        Returns:
            Dict[str, Any]: Serialized GovernmentRAGResponse dictionary.
        """
        active_top_k = top_k if top_k is not None else self.max_context_chunks
        active_min_similarity = min_similarity if min_similarity is not None else self.rag_min_similarity

        # -------------------------------------------------------------------------
        # STEP 1: Input Query Validation
        # -------------------------------------------------------------------------
        # WHAT: Validate that query is non-null, non-empty, and non-whitespace.
        # WHY: Fast-fail invalid queries without making retrieval or LLM calls.
        if not query or not query.strip():
            return GovernmentRAGResponse(
                query=query or "",
                answer="Query string cannot be empty or whitespace.",
                status="VALIDATION_ERROR",
                grounding_status="RETRIEVAL_FAILED",
                retrieval_count=0,
                sources=[]
            ).to_dict()

        clean_query = query.strip()

        # -------------------------------------------------------------------------
        # STEP 2: Phase 6C Semantic Search Retrieval
        # -------------------------------------------------------------------------
        # WHAT: Retrieve semantically similar government knowledge chunks using Phase 6C.
        # WHY: Implements 'Retrieve First, Generate Second' principle.
        retrieval_response = self.retrieval_service.search_government_knowledge(
            query=clean_query,
            top_k=active_top_k,
            similarity_threshold=0.0  # Fetch raw matches to inspect scores against min_similarity
        )

        retrieval_status = retrieval_response.get("status")

        # Empty knowledge base returns INSUFFICIENT_GOVERNMENT_EVIDENCE without LLM call
        if retrieval_status == "KNOWLEDGE_BASE_EMPTY":
            return GovernmentRAGResponse(
                query=clean_query,
                answer="Insufficient government evidence was retrieved to answer this question.",
                status="INSUFFICIENT_GOVERNMENT_EVIDENCE",
                grounding_status="INSUFFICIENT_EVIDENCE",
                retrieval_count=0,
                sources=[]
            ).to_dict()

        # Handle Phase 6C Retrieval database/embedding errors
        if retrieval_status in ["DATABASE_ERROR", "EMBEDDING_ERROR", "EMBEDDING_DIMENSION_MISMATCH"]:
            return GovernmentRAGResponse(
                query=clean_query,
                answer=f"Government knowledge retrieval failed: {retrieval_response.get('error_message')}",
                status="RETRIEVAL_FAILED",
                grounding_status="RETRIEVAL_FAILED",
                retrieval_count=0,
                error_message=retrieval_response.get("error_message"),
                sources=[]
            ).to_dict()

        retrieved_results = retrieval_response.get("results", [])

        # Filter retrieved results against active grounding similarity threshold
        qualifying_chunks = [
            r for r in retrieved_results
            if r.get("similarity_score", 0.0) >= active_min_similarity
        ]

        # -------------------------------------------------------------------------
        # STEP 3: Insufficient Evidence Safety Check
        # -------------------------------------------------------------------------
        # WHAT: Check if any retrieved chunks met the min_similarity grounding threshold.
        # WHY: SAFETY CRITICAL RULE: If evidence is missing or weak, DO NOT CALL LLM.
        # HOW: Return status INSUFFICIENT_GOVERNMENT_EVIDENCE immediately.
        if not qualifying_chunks:
            return GovernmentRAGResponse(
                query=clean_query,
                answer="Insufficient government evidence was retrieved to answer this question.",
                status="INSUFFICIENT_GOVERNMENT_EVIDENCE",
                grounding_status="INSUFFICIENT_EVIDENCE",
                retrieval_count=len(retrieved_results),
                sources=[]
            ).to_dict()

        # Limit context chunks to max_context_chunks
        context_chunks = qualifying_chunks[:active_top_k]

        # Build lookup map of retrieved chunks for citation validation and metadata mapping
        context_chunk_map: Dict[str, Dict[str, Any]] = {
            c["chunk_id"]: c for c in context_chunks
        }

        # -------------------------------------------------------------------------
        # STEP 4: Grounded Prompt Construction (with Prompt Injection Protection)
        # -------------------------------------------------------------------------
        # WHAT: Format prompt containing query and untrusted document text bounded by XML tags.
        # WHY: Protects against prompt injection attacks embedded inside document text.
        grounded_prompt = build_grounded_rag_prompt(clean_query, context_chunks)

        # -------------------------------------------------------------------------
        # STEP 5: LLM Execution
        # -------------------------------------------------------------------------
        # WHAT: Call configured LLM provider to generate grounded JSON response.
        # WHY: Generates concise factual answer based ONLY on provided evidence context.
        try:
            llm_raw_output = self.llm_provider.generate_json(
                prompt=grounded_prompt,
                system_prompt=GOVERNMENT_RAG_SYSTEM_PROMPT
            )
        except Exception as e:
            return GovernmentRAGResponse(
                query=clean_query,
                answer="Failed to generate response from LLM provider.",
                status="GENERATION_FAILED",
                grounding_status="GENERATION_FAILED",
                retrieval_count=len(context_chunks),
                error_message=f"LLM API execution error: {str(e)}",
                sources=[]
            ).to_dict()

        # -------------------------------------------------------------------------
        # STEP 6: Parse Structured JSON Response
        # -------------------------------------------------------------------------
        try:
            clean_output = llm_raw_output.strip()
            if clean_output.startswith("```"):
                clean_output = re.sub(r"^```(?:json)?\s*", "", clean_output)
                clean_output = re.sub(r"\s*```$", "", clean_output)

            llm_data = json.loads(clean_output)
        except Exception as e:
            return GovernmentRAGResponse(
                query=clean_query,
                answer="LLM provider generated malformed non-JSON output.",
                status="GENERATION_FAILED",
                grounding_status="GENERATION_FAILED",
                retrieval_count=len(context_chunks),
                error_message=f"JSON decode failure: {str(e)}",
                sources=[]
            ).to_dict()

        raw_answer = llm_data.get("answer", "No answer text returned.")
        raw_grounding = llm_data.get("grounding_status", "GROUNDED")
        cited_chunk_ids = llm_data.get("source_chunk_ids", [])

        # -------------------------------------------------------------------------
        # STEP 7: Strict Citation Validation
        # -------------------------------------------------------------------------
        # WHAT: Verify that every cited source_chunk_id exists in retrieved context map.
        # WHY: HALLUCINATION PREVENTION: Rejects responses citing hallucinated chunk IDs (e.g. GOV-999).
        invalid_citations = [cid for cid in cited_chunk_ids if cid not in context_chunk_map]

        if invalid_citations:
            return GovernmentRAGResponse(
                query=clean_query,
                answer="Citation validation failed: LLM referenced unknown chunk IDs not present in retrieved context.",
                status="CITATION_VALIDATION_ERROR",
                grounding_status="GENERATION_FAILED",
                retrieval_count=len(context_chunks),
                error_message=f"LLM cited unknown chunk_ids: {invalid_citations}",
                sources=[]
            ).to_dict()

        # -------------------------------------------------------------------------
        # STEP 8: Application Source Metadata Mapping
        # -------------------------------------------------------------------------
        # WHAT: Map cited chunk IDs back to official retrieved chunk metadata.
        # WHY: Ensures Document Name, Page Number, Section Name, Similarity Score, and Quote
        #      come from application data, NOT from LLM generation.
        sources: List[GovernmentRAGSource] = []
        seen_chunk_ids = set()

        for cid in cited_chunk_ids:
            if cid in seen_chunk_ids:
                continue
            seen_chunk_ids.add(cid)

            chunk_meta = context_chunk_map[cid]
            sources.append(GovernmentRAGSource(
                chunk_id=chunk_meta["chunk_id"],
                document_id=chunk_meta["document_id"],
                document_name=chunk_meta["document_name"],
                page_number=chunk_meta["page_number"],
                section_name=chunk_meta.get("section_name"),
                similarity_score=chunk_meta["similarity_score"],
                quoted_text=chunk_meta["text"]
            ))

        return GovernmentRAGResponse(
            query=clean_query,
            answer=raw_answer,
            status="SUCCESS",
            grounding_status=raw_grounding if raw_grounding in ["GROUNDED", "INSUFFICIENT_EVIDENCE"] else "GROUNDED",
            retrieval_count=len(context_chunks),
            error_message=None,
            sources=sources
        ).to_dict()
