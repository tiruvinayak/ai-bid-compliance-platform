"""
===============================================================================
MODULE: app/government_retrieval_service.py
===============================================================================
PURPOSE:
    Core service implementation for Phase 6C (Semantic Retrieval Engine).

WHAT IT DOES:
    - Accepts natural-language queries (or tender requirement texts).
    - Generates query vector embeddings using the configured EmbeddingProvider.
    - Validates query vector dimensions against stored vector dimensions.
    - Searches PostgreSQL + pgvector (or fallback repository) for semantically similar knowledge chunks.
    - Performs Hybrid Reciprocal Keyword + Vector Re-ranking (Dense Cosine Similarity + BM25 Term Overlap).
    - Applies configurable similarity thresholding and top-K result filtering.
    - Performs deterministic tie-breaking (highest similarity score DESC, chunk_id ASC).
    - Returns structured, page-traceable search results (GovernmentRetrievalResponse).

WHY WE NEED IT:
    Connects the user query to the stored government vector knowledge base.
    Enables government officers to search official procurement guidelines and instantly view
    the exact page numbers, section names, and source text snippets supporting compliance decisions.

HOW IT FITS INTO SEMANTIC RETRIEVAL / RAG:
    User Query -> GovernmentRetrievalService -> Hybrid Re-ranking -> Phase 6C Search Results
    -> Grounded RAG Context (Phase 6D)
===============================================================================
"""

# standard library imports
import re
from typing import Any, Dict, List, Optional, Union

# App imports
from app.embedding_provider import BaseEmbeddingProvider, get_embedding_provider
from app.repositories.government_vector_repository import (
    GovernmentVectorRepository,
    InMemVectorRepository,
)
from app.schemas.government_retrieval import (
    GovernmentRetrievalResponse,
    GovernmentRetrievalResult,
)


class GovernmentRetrievalService:
    """
    Service orchestrator for semantic retrieval over government knowledge vectors.
    """

    def __init__(
        self,
        embedding_provider: Optional[BaseEmbeddingProvider] = None,
        vector_repository: Optional[Union[GovernmentVectorRepository, InMemVectorRepository]] = None,
        default_top_k: int = 5,
        default_similarity_threshold: float = 0.20
    ):
        """
        Initializes GovernmentRetrievalService with injected or default provider and repository.
        """
        self.embedding_provider = embedding_provider or get_embedding_provider()

        if vector_repository:
            self.vector_repository = vector_repository
        else:
            pg_repo = GovernmentVectorRepository()
            ok, _ = pg_repo.is_pgvector_available()
            if ok:
                self.vector_repository = pg_repo
            else:
                from pathlib import Path
                self.vector_repository = InMemVectorRepository.get_shared_instance(storage_file=Path("output/government_knowledge/vectors_store.json"))

        self.default_top_k = default_top_k
        self.default_similarity_threshold = default_similarity_threshold

    def search_government_knowledge(
        self,
        query: str,
        top_k: Optional[int] = None,
        similarity_threshold: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Main entry point for searching semantically relevant government knowledge chunks.

        Args:
            query (str): Natural-language query string (e.g. "bidder eligibility requirements").
            top_k (int, optional): Maximum number of results to return. Defaults to self.default_top_k.
            similarity_threshold (float, optional): Minimum similarity score cutoff (0.0 to 1.0).

        Returns:
            Dict[str, Any]: Serialized GovernmentRetrievalResponse dictionary.
        """
        active_top_k = top_k if top_k is not None else self.default_top_k
        active_threshold = similarity_threshold if similarity_threshold is not None else self.default_similarity_threshold

        # -------------------------------------------------------------------------
        # STEP 1: Query Validation
        # -------------------------------------------------------------------------
        if not query or not query.strip():
            return GovernmentRetrievalResponse(
                query=query or "",
                total_results=0,
                status="VALIDATION_ERROR",
                error_message="Query string cannot be empty or whitespace.",
                results=[]
            ).to_dict()

        clean_query = query.strip()

        # -------------------------------------------------------------------------
        # STEP 2: Empty Knowledge Base Check
        # -------------------------------------------------------------------------
        total_vectors = self.vector_repository.get_total_vectors_count()
        if total_vectors == 0:
            return GovernmentRetrievalResponse(
                query=clean_query,
                total_results=0,
                status="KNOWLEDGE_BASE_EMPTY",
                error_message="No government knowledge vectors are available for retrieval. Please ingest documents first.",
                results=[]
            ).to_dict()

        # -------------------------------------------------------------------------
        # STEP 3: Query Embedding Generation
        # -------------------------------------------------------------------------
        try:
            query_vector = self.embedding_provider.embed_text(clean_query)
        except Exception as e:
            return GovernmentRetrievalResponse(
                query=clean_query,
                total_results=0,
                status="EMBEDDING_ERROR",
                error_message=f"Failed to generate query embedding: {str(e)}",
                results=[]
            ).to_dict()

        # -------------------------------------------------------------------------
        # STEP 4: Embedding Dimension Safety Validation
        # -------------------------------------------------------------------------
        if len(query_vector) != self.embedding_provider.dimension:
            return GovernmentRetrievalResponse(
                query=clean_query,
                total_results=0,
                status="EMBEDDING_DIMENSION_MISMATCH",
                error_message=f"Query vector dimension ({len(query_vector)}) does not match expected dimension ({self.embedding_provider.dimension}).",
                results=[]
            ).to_dict()

        # -------------------------------------------------------------------------
        # STEP 5: Vector Similarity Search
        # -------------------------------------------------------------------------
        try:
            matches = self.vector_repository.search_similar(
                query_embedding=query_vector,
                top_k=max(active_top_k, 10),
                similarity_threshold=-1.0 if active_threshold <= 0.0 else active_threshold
            )
        except Exception as e:
            return GovernmentRetrievalResponse(
                query=clean_query,
                total_results=0,
                status="DATABASE_ERROR",
                error_message=f"Database vector similarity search failed: {str(e)}",
                results=[]
            ).to_dict()

        if not matches:
            return GovernmentRetrievalResponse(
                query=clean_query,
                total_results=0,
                status="NO_RELEVANT_RESULTS",
                error_message=None,
                results=[]
            ).to_dict()

        # -------------------------------------------------------------------------
        # STEP 6: Hybrid Term-Overlap Reranking
        # -------------------------------------------------------------------------
        # WHAT: Combines dense vector cosine similarity with BM25-style keyword term overlap.
        # WHY: Boosts chunks containing explicit domain terms (e.g. "turnover", "EMD", "eligibility").
        query_words = set(re.findall(r"\w+", clean_query.lower()))
        filtered_query_words = {w for w in query_words if len(w) > 2 and w not in ["and", "the", "for", "with"]}

        reranked_matches = []
        for item in matches:
            chunk_text = str(item.get("text", "")).lower()
            section_text = str(item.get("section_name", "") or "").lower()
            combined_text = f"{section_text} {chunk_text}"
            doc_words = set(re.findall(r"\w+", combined_text))

            if filtered_query_words:
                overlap_ratio = len(filtered_query_words.intersection(doc_words)) / len(filtered_query_words)
            else:
                overlap_ratio = 0.0

            raw_sim = item.get("similarity_score", 0.0)

            # Combined hybrid score (0.70 Vector Similarity + 0.30 Keyword Overlap)
            hybrid_score = round(0.70 * raw_sim + 0.30 * overlap_ratio, 4)

            updated_item = dict(item)
            updated_item["similarity_score"] = hybrid_score
            reranked_matches.append(updated_item)

        # Sort descending by hybrid similarity_score
        reranked_matches.sort(key=lambda x: (x.get("similarity_score", 0.0), x.get("chunk_id", "")), reverse=True)

        # Filter by active threshold if positive threshold requested
        if active_threshold > 0.0:
            final_matches = [m for m in reranked_matches if m.get("similarity_score", 0.0) >= active_threshold][:active_top_k]
        else:
            final_matches = reranked_matches[:active_top_k]

        if not final_matches:
            return GovernmentRetrievalResponse(
                query=clean_query,
                total_results=0,
                status="NO_RELEVANT_RESULTS",
                error_message=None,
                results=[]
            ).to_dict()

        # -------------------------------------------------------------------------
        # STEP 7: Format & Rank Results with Source Traceability
        # -------------------------------------------------------------------------
        retrieval_results: List[GovernmentRetrievalResult] = []
        for idx, item in enumerate(final_matches, start=1):
            retrieval_results.append(GovernmentRetrievalResult(
                chunk_id=item.get("chunk_id", ""),
                document_id=item.get("document_id", ""),
                document_name=item.get("document_name", ""),
                source_type=item.get("source_type", "GOVERNMENT"),
                page_number=item.get("page_number", 1),
                section_name=item.get("section_name"),
                text=item.get("text", ""),
                similarity_score=item.get("similarity_score", 0.0),
                rank=idx
            ))

        return GovernmentRetrievalResponse(
            query=clean_query,
            total_results=len(retrieval_results),
            status="SUCCESS",
            error_message=None,
            results=retrieval_results
        ).to_dict()
