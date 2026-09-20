"""
===============================================================================
MODULE: app/government_embedding_service.py
===============================================================================
PURPOSE:
    Service orchestrator for Phase 6B (Embeddings + Vector Storage).

WHAT IT DOES:
    - Coordinates Phase 6A knowledge chunks with EmbeddingProvider and GovernmentVectorRepository.
    - Performs batch embedding generation using configured EmbeddingProvider.
    - Validates vector dimensions (raising EMBEDDING_DIMENSION_MISMATCH if mismatched).
    - Manages idempotent duplicate detection (skipping chunks whose content_hash already exists).
    - Stores complete vector records with source metadata into PostgreSQL + pgvector (or fallback repo).

WHY WE NEED IT:
    Encapsulates the business workflow of vectorizing and persisting knowledge chunks.
    Guarantees zero duplicate vectors and enforces strict vector dimension integrity.

HOW IT FITS INTO SEMANTIC SEARCH / RAG:
    Phase 6A Knowledge Chunks -> GovernmentEmbeddingService.embed_and_store_chunks()
    -> Dense Vectors -> Repository Storage -> Vector Similarity Search (Phase 6C+)
===============================================================================
"""

# standard library imports
import datetime
from typing import Any, Dict, List, Optional, Tuple, Union

# App imports
from app.embedding_provider import BaseEmbeddingProvider, get_embedding_provider
from app.repositories.government_vector_repository import (
    GovernmentVectorRepository,
    InMemVectorRepository,
)
from app.schemas.government_knowledge import GovernmentKnowledgeChunk
from app.schemas.government_vector import GovernmentKnowledgeVector


class GovernmentEmbeddingService:
    """
    Service orchestrator for embedding and storing government knowledge chunks.
    """

    def __init__(
        self,
        embedding_provider: Optional[BaseEmbeddingProvider] = None,
        vector_repository: Optional[Union[GovernmentVectorRepository, InMemVectorRepository]] = None
    ):
        """
        Initializes GovernmentEmbeddingService with injected or default provider and repository.
        """
        self.embedding_provider = embedding_provider or get_embedding_provider()

        if vector_repository:
            self.vector_repository = vector_repository
        else:
            # Check if Postgres is available; if not, use InMemVectorRepository
            pg_repo = GovernmentVectorRepository()
            ok, _ = pg_repo.is_pgvector_available()
            if ok:
                self.vector_repository = pg_repo
            else:
                self.vector_repository = InMemVectorRepository.get_shared_instance()

        # Initialize schema table
        self.vector_repository.init_db(dimension=self.embedding_provider.dimension)

    def embed_and_store_chunks(
        self,
        chunks: List[Union[GovernmentKnowledgeChunk, Dict[str, Any]]],
        doc_name: str = "unknown",
        page_count: int = 1
    ) -> Dict[str, Any]:
        """
        Main entry point for batch embedding and storing knowledge chunks.

        Args:
            chunks: List of GovernmentKnowledgeChunk objects or dict representations.
            doc_name: Source document filename.
            page_count: Total pages processed in source document.

        Returns:
            Dict[str, Any]: Ingestion execution summary statistics.
        """
        if not chunks:
            return {
                "document_name": doc_name,
                "total_pages": page_count,
                "total_chunks": 0,
                "embeddings_created": 0,
                "embeddings_skipped": 0,
                "errors": 0,
                "status": "SUCCESS",
                "vectors": []
            }

        # Normalize input chunks to GovernmentKnowledgeChunk objects
        chunk_objects: List[GovernmentKnowledgeChunk] = []
        for c in chunks:
            if isinstance(c, dict):
                chunk_objects.append(GovernmentKnowledgeChunk(
                    chunk_id=c.get("chunk_id", ""),
                    document_id=c.get("document_id", ""),
                    document_name=c.get("document_name", doc_name),
                    source_type=c.get("source_type", "GOVERNMENT"),
                    page_number=c.get("page_number", 1),
                    section_name=c.get("section_name"),
                    text=str(c.get("text", "")),
                    character_count=c.get("character_count", len(str(c.get("text", ""))))
                ))
            else:
                chunk_objects.append(c)

        # -------------------------------------------------------------------------
        # STEP 1: Idempotent Duplicate Check
        # -------------------------------------------------------------------------
        chunks_to_embed: List[GovernmentKnowledgeChunk] = []
        skipped_count = 0
        stored_vector_dicts: List[Dict[str, Any]] = []

        for chk in chunk_objects:
            text_str = str(chk.text)
            import hashlib
            content_hash = hashlib.sha256(text_str.encode("utf-8")).hexdigest()

            # Check if vector already exists by content_hash or chunk_id
            existing = self.vector_repository.get_by_content_hash(content_hash)
            if not existing:
                existing = self.vector_repository.get_by_chunk_id(chk.chunk_id)

            if existing:
                skipped_count += 1
                stored_vector_dicts.append(existing)
            else:
                chunks_to_embed.append(chk)

        # If all chunks are already ingested
        if not chunks_to_embed:
            return {
                "document_name": doc_name,
                "total_pages": page_count,
                "total_chunks": len(chunk_objects),
                "embeddings_created": 0,
                "embeddings_skipped": skipped_count,
                "errors": 0,
                "status": "ALREADY_INGESTED",
                "vectors": stored_vector_dicts
            }

        # -------------------------------------------------------------------------
        # STEP 2: Batch Vector Generation
        # -------------------------------------------------------------------------
        texts = [str(c.text) for c in chunks_to_embed]
        embeddings = self.embedding_provider.embed_texts(texts)

        # -------------------------------------------------------------------------
        # STEP 3: Vector Dimension Safety Validation & Storage
        # -------------------------------------------------------------------------
        created_count = 0
        error_count = 0

        for chk, vec in zip(chunks_to_embed, embeddings):
            # Enforce dimension check
            if len(vec) != self.embedding_provider.dimension:
                raise ValueError(
                    f"EMBEDDING_DIMENSION_MISMATCH: Generated vector dimension ({len(vec)}) "
                    f"does not match provider expected dimension ({self.embedding_provider.dimension})."
                )

            text_str = str(chk.text)
            import hashlib
            content_hash = hashlib.sha256(text_str.encode("utf-8")).hexdigest()

            vec_item = GovernmentKnowledgeVector(
                chunk_id=chk.chunk_id,
                document_id=chk.document_id,
                document_name=chk.document_name,
                source_type=chk.source_type,
                page_number=chk.page_number,
                section_name=chk.section_name,
                text=text_str,
                content_hash=content_hash,
                embedding=vec,
                embedding_model=self.embedding_provider.model_name,
                embedding_dimension=self.embedding_provider.dimension,
                created_at=datetime.datetime.now(datetime.timezone.utc).isoformat()
            )

            status_res = self.vector_repository.upsert_vector(vec_item)
            if status_res in ["INSERTED", "UPDATED"]:
                created_count += 1
                stored_vector_dicts.append(vec_item.to_dict())
            else:
                skipped_count += 1

        return {
            "document_name": doc_name,
            "total_pages": page_count,
            "total_chunks": len(chunk_objects),
            "embeddings_created": created_count,
            "embeddings_skipped": skipped_count,
            "errors": error_count,
            "status": "SUCCESS",
            "vectors": stored_vector_dicts
        }
