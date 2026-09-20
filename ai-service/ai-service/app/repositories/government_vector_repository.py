"""
===============================================================================
MODULE: app/repositories/government_vector_repository.py
===============================================================================
PURPOSE:
    Repository layer for Phase 6B & 6C (Government Knowledge Embeddings + Semantic Retrieval).

WHAT IT DOES:
    - Provides GovernmentVectorRepository interfacing with PostgreSQL + pgvector.
    - Executes 'CREATE EXTENSION IF NOT EXISTS vector;' and manages table schema.
    - Stores, retrieves, updates, and queries vector embeddings with metadata.
    - Performs cosine similarity search queries with thresholding, top-K filtering, and tie-breaking.
    - Provides InMemVectorRepository fallback with optional JSON file persistence for offline environments.

WHY WE NEED IT:
    Decouples database persistence logic from business orchestrator logic.
    Enforces idempotent vector insertions and deterministic similarity search queries.

HOW IT FITS INTO SEMANTIC SEARCH / RAG:
    Query Embedding -> search_similar() -> Cosine Distance (<=>) Query -> Ranked Results -> RAG Context
===============================================================================
"""

# standard library imports
import json
import math
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from app.schemas.government_vector import GovernmentKnowledgeVector


class GovernmentVectorRepository:
    """
    PostgreSQL + pgvector repository for managing government knowledge vectors.
    """

    def __init__(self, db_url: Optional[str] = None):
        """Initializes repository with PostgreSQL connection configuration."""
        self.db_url = db_url or os.environ.get("DATABASE_URL")
        self.host = os.environ.get("DB_HOST", "localhost")
        self.port = os.environ.get("DB_PORT", "5432")
        self.db_name = os.environ.get("DB_NAME", "procurement_db")
        self.user = os.environ.get("DB_USER", "postgres")
        self.password = os.environ.get("DB_PASSWORD", "")

    def is_pgvector_available(self) -> Tuple[bool, str]:
        """Checks if PostgreSQL and pgvector extension are accessible."""
        try:
            import psycopg2
            conn = psycopg2.connect(
                dbname=self.db_name,
                user=self.user,
                password=self.password,
                host=self.host,
                port=self.port,
                connect_timeout=3
            )
            cursor = conn.cursor()
            cursor.execute("SELECT 1 FROM pg_extension WHERE extname = 'vector';")
            row = cursor.fetchone()
            cursor.close()
            conn.close()
            if not row:
                return False, "pgvector extension not installed in PostgreSQL. Using InMemVectorRepository fallback."
            return True, "PostgreSQL + pgvector extension connection successful."
        except ImportError:
            return False, "psycopg2 library not installed. Using InMemVectorRepository fallback."
        except Exception as e:
            return False, f"PostgreSQL database connection unavailable: {str(e)}"

    def init_db(self, dimension: int = 768) -> bool:
        """Initializes vector extension and creates table government_knowledge_vectors."""
        ok, msg = self.is_pgvector_available()
        if not ok:
            return False

        import psycopg2
        conn = psycopg2.connect(
            dbname=self.db_name, user=self.user, password=self.password, host=self.host, port=self.port
        )
        cursor = conn.cursor()
        cursor.execute("CREATE EXTENSION IF NOT EXISTS vector;")
        cursor.execute(f"""
            CREATE TABLE IF NOT EXISTS government_knowledge_vectors (
                chunk_id VARCHAR(100) PRIMARY KEY,
                document_id VARCHAR(100) NOT NULL,
                document_name VARCHAR(255) NOT NULL,
                source_type VARCHAR(50) NOT NULL DEFAULT 'GOVERNMENT',
                page_number INTEGER NOT NULL,
                section_name TEXT,
                text TEXT NOT NULL,
                content_hash VARCHAR(64) NOT NULL,
                embedding vector({dimension}),
                embedding_model VARCHAR(100) NOT NULL,
                embedding_dimension INTEGER NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_gov_vec_hash ON government_knowledge_vectors(content_hash);")
        conn.commit()
        cursor.close()
        conn.close()
        return True

    def get_total_vectors_count(self) -> int:
        """Returns total count of stored knowledge vectors."""
        ok, _ = self.is_pgvector_available()
        if not ok:
            return 0

        import psycopg2
        conn = psycopg2.connect(
            dbname=self.db_name, user=self.user, password=self.password, host=self.host, port=self.port
        )
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM government_knowledge_vectors;")
        count = cursor.fetchone()[0]
        cursor.close()
        conn.close()
        return count

    def get_by_chunk_id(self, chunk_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves vector record by chunk_id."""
        ok, _ = self.is_pgvector_available()
        if not ok:
            return None

        import psycopg2
        conn = psycopg2.connect(
            dbname=self.db_name, user=self.user, password=self.password, host=self.host, port=self.port
        )
        cursor = conn.cursor()
        cursor.execute("SELECT chunk_id, document_id, document_name, page_number, section_name, text, content_hash, embedding_model, embedding_dimension FROM government_knowledge_vectors WHERE chunk_id = %s;", (chunk_id,))
        row = cursor.fetchone()
        cursor.close()
        conn.close()

        if row:
            return {
                "chunk_id": row[0],
                "document_id": row[1],
                "document_name": row[2],
                "page_number": row[3],
                "section_name": row[4],
                "text": row[5],
                "content_hash": row[6],
                "embedding_model": row[7],
                "embedding_dimension": row[8],
            }
        return None

    def get_by_content_hash(self, content_hash: str) -> Optional[Dict[str, Any]]:
        """Retrieves vector record by content_hash."""
        ok, _ = self.is_pgvector_available()
        if not ok:
            return None

        import psycopg2
        conn = psycopg2.connect(
            dbname=self.db_name, user=self.user, password=self.password, host=self.host, port=self.port
        )
        cursor = conn.cursor()
        cursor.execute("SELECT chunk_id, document_id, document_name, page_number, section_name, text, content_hash, embedding_model, embedding_dimension FROM government_knowledge_vectors WHERE content_hash = %s;", (content_hash,))
        row = cursor.fetchone()
        cursor.close()
        conn.close()

        if row:
            return {
                "chunk_id": row[0],
                "document_id": row[1],
                "document_name": row[2],
                "page_number": row[3],
                "section_name": row[4],
                "text": row[5],
                "content_hash": row[6],
                "embedding_model": row[7],
                "embedding_dimension": row[8],
            }
        return None

    def upsert_vector(self, vector_item: GovernmentKnowledgeVector) -> str:
        """Inserts or updates vector record idempotently."""
        ok, _ = self.is_pgvector_available()
        if not ok:
            return "SKIPPED"

        existing = self.get_by_content_hash(vector_item.content_hash)
        if existing:
            return "SKIPPED"

        import psycopg2
        conn = psycopg2.connect(
            dbname=self.db_name, user=self.user, password=self.password, host=self.host, port=self.port
        )
        cursor = conn.cursor()

        vec_str = "[" + ",".join(str(f) for f in vector_item.embedding) + "]"
        cursor.execute("""
            INSERT INTO government_knowledge_vectors (
                chunk_id, document_id, document_name, source_type, page_number, section_name, text, content_hash, embedding, embedding_model, embedding_dimension
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s::vector, %s, %s)
            ON CONFLICT (chunk_id) DO UPDATE SET
                text = EXCLUDED.text,
                content_hash = EXCLUDED.content_hash,
                embedding = EXCLUDED.embedding,
                section_name = EXCLUDED.section_name;
        """, (
            vector_item.chunk_id,
            vector_item.document_id,
            vector_item.document_name,
            vector_item.source_type,
            vector_item.page_number,
            vector_item.section_name,
            vector_item.text,
            vector_item.content_hash,
            vec_str,
            vector_item.embedding_model,
            vector_item.embedding_dimension
        ))

        conn.commit()
        cursor.close()
        conn.close()
        return "INSERTED"

    def search_similar(
        self,
        query_embedding: List[float],
        top_k: int = 5,
        similarity_threshold: float = 0.70
    ) -> List[Dict[str, Any]]:
        """
        Performs cosine similarity search using pgvector (<=> operator).
        """
        ok, _ = self.is_pgvector_available()
        if not ok:
            return []

        import psycopg2
        conn = psycopg2.connect(
            dbname=self.db_name, user=self.user, password=self.password, host=self.host, port=self.port
        )
        cursor = conn.cursor()

        vec_str = "[" + ",".join(str(f) for f in query_embedding) + "]"
        cursor.execute("""
            SELECT chunk_id, document_id, document_name, source_type, page_number, section_name, text, content_hash,
                   (1.0 - (embedding <=> %s::vector)) AS similarity_score
            FROM government_knowledge_vectors
            WHERE (1.0 - (embedding <=> %s::vector)) >= %s
            ORDER BY similarity_score DESC, chunk_id ASC
            LIMIT %s;
        """, (vec_str, vec_str, similarity_threshold, top_k))

        rows = cursor.fetchall()
        cursor.close()
        conn.close()

        results = []
        for r in rows:
            results.append({
                "chunk_id": r[0],
                "document_id": r[1],
                "document_name": r[2],
                "source_type": r[3],
                "page_number": r[4],
                "section_name": r[5],
                "text": r[6],
                "content_hash": r[7],
                "similarity_score": round(float(r[8]), 4),
            })
        return results


class InMemVectorRepository:
    """
    In-memory vector storage repository for unit tests and offline testing.

    WHAT IT DOES:
        Stores GovernmentKnowledgeVector objects in an in-memory dictionary.
        Supports isolated instances by default for unit tests, and get_shared_instance() for process-wide shared RAG storage.
    """
    _shared_instance = None

    @classmethod
    def get_shared_instance(cls, storage_file: Optional[Path] = None):
        """Returns process-wide singleton InMemVectorRepository instance."""
        if cls._shared_instance is None:
            cls._shared_instance = InMemVectorRepository(storage_file=storage_file)
        return cls._shared_instance

    def __init__(self, storage_file: Optional[Path] = None):
        self.storage_file = storage_file
        self.storage: Dict[str, GovernmentKnowledgeVector] = {}
        self.hash_index: Dict[str, str] = {}
        if self.storage_file:
            self._load_from_file()

    def clear(self):
        """Clears stored vectors and hash index for test isolation."""
        self.storage.clear()
        self.hash_index.clear()

    def _load_from_file(self):
        """Loads vectors from JSON file if present."""
        if self.storage_file and self.storage_file.exists():
            try:
                data = json.loads(self.storage_file.read_text(encoding="utf-8"))
                for item in data.get("vectors", []):
                    vec = GovernmentKnowledgeVector(
                        chunk_id=item["chunk_id"],
                        document_id=item["document_id"],
                        document_name=item["document_name"],
                        source_type=item.get("source_type", "GOVERNMENT"),
                        page_number=item["page_number"],
                        section_name=item.get("section_name"),
                        text=item["text"],
                        content_hash=item["content_hash"],
                        embedding=item["embedding"],
                        embedding_model=item.get("embedding_model", "mock-embedding-v1"),
                        embedding_dimension=item.get("embedding_dimension", len(item["embedding"])),
                        created_at=item.get("created_at")
                    )
                    self.storage[vec.chunk_id] = vec
                    self.hash_index[vec.content_hash] = vec.chunk_id
            except Exception:
                pass

    def _save_to_file(self):
        """Persists stored vectors to JSON file."""
        if self.storage_file:
            try:
                self.storage_file.parent.mkdir(parents=True, exist_ok=True)
                data = {
                    "total_vectors": len(self.storage),
                    "vectors": [v.to_dict() for v in self.storage.values()]
                }
                self.storage_file.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
            except Exception:
                pass

    def init_db(self, dimension: int = 768) -> bool:
        return True

    def get_total_vectors_count(self) -> int:
        return len(self.storage)

    def get_by_chunk_id(self, chunk_id: str) -> Optional[Dict[str, Any]]:
        vec = self.storage.get(chunk_id)
        return vec.to_dict() if vec else None

    def get_by_content_hash(self, content_hash: str) -> Optional[Dict[str, Any]]:
        chunk_id = self.hash_index.get(content_hash)
        if chunk_id and chunk_id in self.storage:
            return self.storage[chunk_id].to_dict()
        return None

    def upsert_vector(self, vector_item: GovernmentKnowledgeVector) -> str:
        if vector_item.content_hash in self.hash_index:
            existing_cid = self.hash_index[vector_item.content_hash]
            if existing_cid == vector_item.chunk_id:
                return "SKIPPED"

        status = "UPDATED" if vector_item.chunk_id in self.storage else "INSERTED"
        self.storage[vector_item.chunk_id] = vector_item
        self.hash_index[vector_item.content_hash] = vector_item.chunk_id
        if self.storage_file:
            self._save_to_file()
        return status

    def query_similar(self, query_embedding: List[float], top_k: int = 5) -> List[Dict[str, Any]]:
        """Backwards compatible query method for Phase 6B tests."""
        return self.search_similar(query_embedding=query_embedding, top_k=top_k, similarity_threshold=-1.0)

    def search_similar(
        self,
        query_embedding: List[float],
        top_k: int = 5,
        similarity_threshold: float = 0.70
    ) -> List[Dict[str, Any]]:
        """Performs exact cosine similarity search across stored vectors."""
        scored_results = []
        for vec in self.storage.values():
            dot_product = sum(a * b for a, b in zip(query_embedding, vec.embedding))
            norm_a = sum(a * a for a in query_embedding) ** 0.5
            norm_b = sum(b * b for b in vec.embedding) ** 0.5
            sim = dot_product / (norm_a * norm_b) if norm_a > 0 and norm_b > 0 else 0.0

            if sim >= similarity_threshold:
                item = vec.to_dict()
                item["similarity_score"] = round(sim, 4)
                scored_results.append(item)

        scored_results.sort(key=lambda x: (-x["similarity_score"], x["chunk_id"]))
        return scored_results[:top_k]
