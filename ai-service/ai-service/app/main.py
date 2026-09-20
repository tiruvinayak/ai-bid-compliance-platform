"""
===============================================================================
MODULE: main.py
===============================================================================
PURPOSE:
    Command-line interface (CLI) entry point for executing:
    - Phase 1: PDF Document Text Processing
    - Phase 2: AI Requirement Extraction (Tender Documents)
    - Phase 3: Bidder Document Intelligence (Bidder Documents)
    - Phase 4: Compliance Verification Engine (Deterministic Rule Matching & Evaluation)
    - Phase 5: Risk & Conflict Intelligence (Deterministic Risk Scoring & Conflict Audit)
    - Phase 6A: Government Knowledge Ingestion (--ingest-government <pdf_path>)
    - Phase 6B: Government Knowledge Vector Embeddings (--embed-government <pdf_path>)
    - Phase 6C: Semantic Retrieval Engine (--search-government "<query>" [--top-k 5] [--threshold 0.70])
    - Phase 6D: Grounded RAG + Explainable Guidance (--ask-government "<question>" [--top-k 5] [--threshold 0.70])
    - AI Accuracy Validation: Ground-truth accuracy evaluation (--accuracy-test [--provider mock|gemini])

HOW TO RUN:
    1. Run Phase 1 & Phase 2 (Tender requirement extraction):
       python app/main.py input/sample_tender.pdf

    2. Run Phase 1 through Phase 5 (Complete AI Procurement Audit Pipeline):
       python app/main.py input/sample_tender.pdf input/bidder_financial.pdf

    3. Run Phase 6A Government Knowledge Ingestion:
       python app/main.py --ingest-government input/government/procurement_guidelines.pdf

    4. Run Phase 6B Government Knowledge Embeddings & Vector Storage:
       python app/main.py --embed-government input/government/procurement_guidelines.pdf

    5. Run Phase 6C Government Knowledge Semantic Search:
       python app/main.py --search-government "bidder eligibility requirements" --top-k 5 --threshold 0.70

    6. Run Phase 6D Grounded RAG + Explainable Guidance:
       python app/main.py --ask-government "bidder eligibility requirements" --top-k 5 --threshold 0.70

    7. Run AI Accuracy Validation Suite:
       python app/main.py --accuracy-test --provider mock
===============================================================================
"""

# standard library imports
import json
import sys
from pathlib import Path

# Add project root directory (ai-service) to python path so app package can be resolved cleanly
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# Phase 1 import: core PDF extraction function
from app.document_processor import extract_pdf_text

# Phase 2 imports: requirement extraction service and LLM client factory
from app.requirement_extractor import RequirementExtractor

# Phase 3 import: bidder document intelligence analyzer service
from app.bidder_document_analyzer import BidderDocumentAnalyzer

# Phase 4 import: deterministic compliance verification engine
from app.compliance_engine import ComplianceEngine

# Phase 5 import: deterministic risk & conflict intelligence engine
from app.risk_conflict_engine import RiskConflictEngine

# Phase 6A import: government knowledge ingestor service
from app.government_knowledge_ingestor import GovernmentKnowledgeIngestor

# Phase 6B import: government embedding service orchestrator
from app.government_embedding_service import GovernmentEmbeddingService
from app.embedding_provider import get_embedding_provider
from app.repositories.government_vector_repository import GovernmentVectorRepository, InMemVectorRepository

# Phase 6C import: government retrieval service orchestrator
from app.government_retrieval_service import GovernmentRetrievalService

# Phase 6D import: government RAG service orchestrator
from app.government_rag_service import GovernmentRAGService, MockRAGLLM

# Accuracy Evaluator import
from app.accuracy_evaluator import AccuracyEvaluator

from app.llm_client import get_llm_client


def main():
    """
    Main execution routine for executing Phase 1 through Phase 6D & AI Accuracy Validation via CLI.
    """
    if len(sys.argv) < 2:
        print("==================================================================")
        print("ERROR: Missing CLI argument.")
        print("Usage 1 (Phase 1-5 Audit Pipeline): python app/main.py <tender_pdf> [<bidder_pdf>]")
        print("Usage 2 (Phase 6A Ingestion): python app/main.py --ingest-government <pdf>")
        print("Usage 3 (Phase 6B Embeddings): python app/main.py --embed-government <pdf>")
        print("Usage 4 (Phase 6C Search): python app/main.py --search-government \"<query>\" [--top-k 5] [--threshold 0.70]")
        print("Usage 5 (Phase 6D Grounded RAG): python app/main.py --ask-government \"<question>\" [--top-k 5] [--threshold 0.70]")
        print("Usage 6 (AI Accuracy Test): python app/main.py --accuracy-test [--provider mock|gemini]")
        print("==================================================================")
        sys.exit(1)

    output_dir = Path("output")
    output_dir.mkdir(parents=True, exist_ok=True)

    # -------------------------------------------------------------------------
    # ROUTE 0: REST API Server Launcher Flag (--serve)
    # -------------------------------------------------------------------------
    if "--serve" in sys.argv or "--server" in sys.argv:
        # Imports uvicorn server module to launch REST API service.
        # Required to run the FastAPI application on http://0.0.0.0:8000.
        import uvicorn
        # Prints server startup banner string.
        # Required to inform developer of API server address and port.
        print("\n[INFO] Launching SIH 2026 AI REST API Server on http://0.0.0.0:8000...\n")
        # Runs uvicorn server serving app.api_server:app on port 8000.
        # Required to start independent REST server process.
        uvicorn.run("app.api_server:app", host="0.0.0.0", port=8000, reload=False)
        return

    # -------------------------------------------------------------------------
    # ROUTE A: AI Accuracy Validation Suite Flag
    # -------------------------------------------------------------------------
    if sys.argv[1] == "--accuracy-test":
        provider_mode = "mock"
        for i in range(2, len(sys.argv)):
            if sys.argv[i] == "--provider" and i + 1 < len(sys.argv):
                provider_mode = sys.argv[i + 1]

        evaluator = AccuracyEvaluator(provider_mode=provider_mode)
        evaluator.run_full_evaluation()
        print("==================================================")
        print("AI ACCURACY VALIDATION COMPLETE")
        print("==================================================")
        return

    # -------------------------------------------------------------------------
    # ROUTE B: Phase 6A Government Knowledge Ingestion Flag
    # -------------------------------------------------------------------------
    if sys.argv[1] == "--ingest-government":
        if len(sys.argv) < 3:
            print("[ERROR] Missing path to government PDF document.")
            print("Usage: python app/main.py --ingest-government input/government/procurement_guidelines.pdf")
            sys.exit(1)

        gov_pdf_path = sys.argv[2]
        print(f"\n[INFO] Starting Phase 6A Government Knowledge Ingestion: '{gov_pdf_path}'...")
        ingestor = GovernmentKnowledgeIngestor()
        gov_result = ingestor.ingest_document(gov_pdf_path)

        gov_output_dir = output_dir / "government_knowledge"
        gov_output_dir.mkdir(parents=True, exist_ok=True)

        doc_name = Path(gov_pdf_path).name
        gov_output_file = gov_output_dir / f"{doc_name}.json"
        gov_json_str = json.dumps(gov_result, indent=2, ensure_ascii=False)

        print("\n==================================================================")
        print("--- PHASE 6A GOVERNMENT KNOWLEDGE INGESTION RESULT (JSON) ---")
        print("==================================================================")
        print(gov_json_str)
        print("==================================================================\n")

        gov_output_file.write_text(gov_json_str, encoding="utf-8")
        print(f"[SUCCESS] Government Knowledge JSON saved to: '{gov_output_file}'")
        return

    # -------------------------------------------------------------------------
    # ROUTE C: Phase 6B Government Knowledge Embeddings Flag
    # -------------------------------------------------------------------------
    if sys.argv[1] == "--embed-government":
        if len(sys.argv) < 3:
            print("[ERROR] Missing path to government PDF document.")
            print("Usage: python app/main.py --embed-government input/government/procurement_guidelines.pdf")
            sys.exit(1)

        gov_pdf_path = sys.argv[2]
        doc_name = Path(gov_pdf_path).name

        print(f"\n[INFO] Starting Phase 6A Knowledge Chunk Ingestion for: '{gov_pdf_path}'...")
        ingestor = GovernmentKnowledgeIngestor()
        gov_result = ingestor.ingest_document(gov_pdf_path)

        if gov_result.get("status") not in ["SUCCESS", "DUPLICATE"]:
            print(f"[FAILURE] Ingestion failed: {gov_result.get('error_message')}")
            sys.exit(1)

        chunks = gov_result.get("chunks", [])
        page_count = gov_result.get("page_count", 1)

        print(f"\n[INFO] Starting Phase 6B Vector Embedding & Storage...")

        pg_repo = GovernmentVectorRepository()
        ok, _ = pg_repo.is_pgvector_available()
        repo = pg_repo if ok else InMemVectorRepository(storage_file=output_dir / "government_knowledge" / "vectors_store.json")

        embed_service = GovernmentEmbeddingService(vector_repository=repo)
        embed_result = embed_service.embed_and_store_chunks(
            chunks=chunks,
            doc_name=doc_name,
            page_count=page_count
        )

        print("\n==================================================================")
        print("--- PHASE 6B GOVERNMENT EMBEDDINGS & VECTOR STORAGE SUMMARY ---")
        print("==================================================================")
        print(f"Government document: {embed_result.get('document_name')}")
        print(f"Pages:               {embed_result.get('total_pages')}")
        print(f"Chunks:              {embed_result.get('total_chunks')}")
        print(f"Embeddings created:  {embed_result.get('embeddings_created')}")
        print(f"Skipped:             {embed_result.get('embeddings_skipped')}")
        print(f"Errors:              {embed_result.get('errors')}")
        print(f"Status:              {embed_result.get('status')}")
        print("==================================================================\n")

        gov_vec_dir = output_dir / "government_knowledge"
        gov_vec_dir.mkdir(parents=True, exist_ok=True)
        vec_file = gov_vec_dir / f"{doc_name}_vectors.json"
        vec_file.write_text(json.dumps(embed_result, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"[SUCCESS] Vector metadata JSON saved to: '{vec_file}'")
        return

    # -------------------------------------------------------------------------
    # ROUTE D: Phase 6C Government Knowledge Semantic Search Flag
    # -------------------------------------------------------------------------
    if sys.argv[1] == "--search-government":
        if len(sys.argv) < 3:
            print("[ERROR] Missing query string.")
            print("Usage: python app/main.py --search-government \"bidder eligibility requirements\" [--top-k 5] [--threshold 0.70]")
            sys.exit(1)

        query_text = sys.argv[2]
        top_k = 5
        threshold = 0.70

        for i in range(3, len(sys.argv)):
            if sys.argv[i] == "--top-k" and i + 1 < len(sys.argv):
                try:
                    top_k = int(sys.argv[i + 1])
                except ValueError:
                    pass
            elif sys.argv[i] == "--threshold" and i + 1 < len(sys.argv):
                try:
                    threshold = float(sys.argv[i + 1])
                except ValueError:
                    pass

        print(f"\n[INFO] Executing Phase 6C Semantic Search for query: '{query_text}' (Top-K: {top_k}, Threshold: {threshold})...")

        pg_repo = GovernmentVectorRepository()
        ok, _ = pg_repo.is_pgvector_available()
        repo = pg_repo if ok else InMemVectorRepository(storage_file=output_dir / "government_knowledge" / "vectors_store.json")

        retrieval_service = GovernmentRetrievalService(vector_repository=repo)
        search_result = retrieval_service.search_government_knowledge(
            query=query_text,
            top_k=top_k,
            similarity_threshold=threshold
        )

        print("\n==================================================================")
        print("GOVERNMENT KNOWLEDGE RETRIEVAL")
        print("==================================================================")
        print(f"Query:          {search_result.get('query')}")
        print(f"Status:         {search_result.get('status')}")
        print(f"Total Results:  {search_result.get('total_results')}")

        results = search_result.get("results", [])
        for r in results:
            print("\n------------------------------------------------------------------")
            print(f"Rank:        {r.get('rank')}")
            print(f"Similarity:  {r.get('similarity_score')}")
            print(f"Document:    {r.get('document_name')}")
            print(f"Page:        {r.get('page_number')}")
            print(f"Section:     {r.get('section_name') or 'N/A'}")
            print(f"Text:        {r.get('text')}")
            print("------------------------------------------------------------------")

        print("==================================================================\n")

        gov_vec_dir = output_dir / "government_knowledge"
        gov_vec_dir.mkdir(parents=True, exist_ok=True)
        search_file = gov_vec_dir / "search_results.json"
        search_file.write_text(json.dumps(search_result, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"[SUCCESS] Search results JSON saved to: '{search_file}'")
        return

    # -------------------------------------------------------------------------
    # ROUTE E: Phase 6D Grounded RAG + Explainable Guidance Flag
    # -------------------------------------------------------------------------
    if sys.argv[1] == "--ask-government":
        if len(sys.argv) < 3:
            print("[ERROR] Missing question string.")
            print("Usage: python app/main.py --ask-government \"bidder eligibility requirements\" [--top-k 5] [--threshold 0.70]")
            sys.exit(1)

        question_text = sys.argv[2]
        top_k = 5
        threshold = 0.70

        for i in range(3, len(sys.argv)):
            if sys.argv[i] == "--top-k" and i + 1 < len(sys.argv):
                try:
                    top_k = int(sys.argv[i + 1])
                except ValueError:
                    pass
            elif sys.argv[i] == "--threshold" and i + 1 < len(sys.argv):
                try:
                    threshold = float(sys.argv[i + 1])
                except ValueError:
                    pass

        embed_provider = get_embedding_provider()

        print(f"\n[INFO] Executing Phase 6D Grounded RAG for question: '{question_text}'...")

        pg_repo = GovernmentVectorRepository()
        ok, _ = pg_repo.is_pgvector_available()
        repo = pg_repo if ok else InMemVectorRepository(storage_file=output_dir / "government_knowledge" / "vectors_store.json")

        retrieval_service = GovernmentRetrievalService(embedding_provider=embed_provider, vector_repository=repo)
        llm_provider = get_llm_client()

        rag_service = GovernmentRAGService(
            retrieval_service=retrieval_service,
            llm_provider=llm_provider,
            rag_min_similarity=threshold,
            max_context_chunks=top_k
        )

        raw_retrieval = retrieval_service.search_government_knowledge(query=question_text, top_k=top_k, similarity_threshold=-1.0)
        raw_results = raw_retrieval.get("results", [])

        rag_result = rag_service.ask_government_knowledge(
            query=question_text,
            top_k=top_k,
            min_similarity=threshold
        )

        print("\n==================================================================")
        print("DEBUGGING TRACE — RAG GROUNDING EVALUATION")
        print("==================================================================")
        print(f"Query:                 {question_text}")
        print(f"Embedding Provider:    {embed_provider.__class__.__name__} ({embed_provider.model_name})")
        print(f"Embedding Dimension:   {embed_provider.dimension}")
        print(f"Retrieved Count:       {len(raw_results)}")
        print(f"Configured Threshold:  {threshold}")
        print(f"Grounding Decision:    {rag_result.get('grounding_status')}\n")

        print("RETRIEVED CHUNKS EVALUATION:")
        if not raw_results:
            print("  No chunks found in database.")
        else:
            for idx, r in enumerate(raw_results, start=1):
                sim = r.get("similarity_score", 0.0)
                dist = round(1.0 - sim, 4)
                passed = sim >= threshold
                status_label = "[PASSED]" if passed else "[FAILED - Below Threshold]"
                print(f"  Item #{idx}: Doc='{r.get('document_name')}' Page={r.get('page_number')} Chunk={r.get('chunk_id')}")
                print(f"          Cosine Similarity: {sim:.4f} | Cosine Distance: {dist:.4f} | Threshold: {threshold} -> {status_label}")

        print("==================================================================")

        print("\n==================================================================")
        print("GOVERNMENT KNOWLEDGE ASSISTANT")
        print("==================================================================")
        print(f"Question:   {rag_result.get('query')}")
        print(f"Status:     {rag_result.get('status')}")
        print(f"Grounding:  {rag_result.get('grounding_status')}\n")
        print(f"Answer:\n{rag_result.get('answer')}\n")
        print("Sources:")

        sources = rag_result.get("sources", [])
        if not sources:
            print("  None")
        else:
            for idx, s in enumerate(sources, start=1):
                print(f"\n  {idx}.")
                print(f"  Chunk ID:    {s.get('chunk_id')}")
                print(f"  Document:    {s.get('document_name')}")
                print(f"  Page:        {s.get('page_number')}")
                print(f"  Section:     {s.get('section_name') or 'N/A'}")
                print(f"  Similarity:  {s.get('similarity_score')}")
                print(f"  Quote:       {s.get('quoted_text')[:120]}...")

        print("==================================================================\n")

        gov_vec_dir = output_dir / "government_knowledge"
        gov_vec_dir.mkdir(parents=True, exist_ok=True)
        rag_file = gov_vec_dir / "rag_answer.json"
        rag_file.write_text(json.dumps(rag_result, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"[SUCCESS] RAG answer JSON saved to: '{rag_file}'")
        return

    # -------------------------------------------------------------------------
    # ROUTE F: Phase 1-5 Pipeline Execution (Tender + Bidder Processing)
    # -------------------------------------------------------------------------
    tender_pdf_path = sys.argv[1]
    bidder_pdf_path = sys.argv[2] if len(sys.argv) >= 3 else None

    # Instantiate global LLM provider (Gemini / OpenAI / Mock fallback)
    llm_client = get_llm_client()

    print(f"\n[INFO] Starting Phase 1 PDF Text Processing for Tender: '{tender_pdf_path}'...")
    phase1_result = extract_pdf_text(tender_pdf_path)

    if not phase1_result.get("success"):
        print(f"[FAILURE] Phase 1 Tender PDF Processing failed: {phase1_result.get('message')}")
        sys.exit(1)

    tender_filename = Path(tender_pdf_path).name
    phase1_output_file = output_dir / f"{tender_filename}.json"
    phase1_output_file.write_text(json.dumps(phase1_result, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"[SUCCESS] Phase 1 result saved to: '{phase1_output_file}'")

    print(f"\n[INFO] Starting Phase 2 AI Requirement Extraction...")
    requirement_extractor = RequirementExtractor(llm_provider=llm_client)
    phase2_result = requirement_extractor.extract_from_phase1_json(phase1_result)

    phase2_json_str = json.dumps(phase2_result, indent=2, ensure_ascii=False)
    print("\n==================================================================")
    print("--- PHASE 2 EXTRACTION RESULT (JSON) ---")
    print("==================================================================")
    print(phase2_json_str)
    print("==================================================================\n")

    if phase2_result.get("success"):
        phase2_output_file = output_dir / f"{tender_filename}_requirements.json"
        phase2_output_file.write_text(phase2_json_str, encoding="utf-8")
        print(f"[SUCCESS] Phase 2 requirement result saved to: '{phase2_output_file}'")
    else:
        print(f"[FAILURE] Phase 2 Requirement Extraction failed: {phase2_result.get('error_message')}")
        if not bidder_pdf_path:
            sys.exit(1)

    if bidder_pdf_path:
        print(f"\n[INFO] Starting Phase 1 PDF Processing for Bidder Document: '{bidder_pdf_path}'...")
        bidder_phase1_result = extract_pdf_text(bidder_pdf_path)

        if not bidder_phase1_result.get("success"):
            print(f"[FAILURE] Phase 1 Bidder PDF Processing failed: {bidder_phase1_result.get('message')}")
            sys.exit(1)

        bidder_filename = Path(bidder_pdf_path).name
        bidder_p1_file = output_dir / f"{bidder_filename}.json"
        bidder_p1_file.write_text(json.dumps(bidder_phase1_result, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"[SUCCESS] Phase 1 Bidder result saved to: '{bidder_p1_file}'")

        print(f"\n[INFO] Starting Phase 3 Bidder Document Intelligence (Requirement-Aware)...")
        bidder_analyzer = BidderDocumentAnalyzer(llm_provider=llm_client)

        target_reqs = phase2_result.get("requirements", [])
        phase3_result = bidder_analyzer.analyze_from_phase1_json(
            phase1_input=bidder_phase1_result,
            target_requirements=target_reqs
        )

        phase3_json_str = json.dumps(phase3_result, indent=2, ensure_ascii=False)
        print("\n==================================================================")
        print("--- PHASE 3 BIDDER DOCUMENT INTELLIGENCE RESULT (JSON) ---")
        print("==================================================================")
        print(phase3_json_str)
        print("==================================================================\n")

        if phase3_result.get("success"):
            phase3_output_file = output_dir / f"{bidder_filename}_facts.json"
            phase3_output_file.write_text(phase3_json_str, encoding="utf-8")
            print(f"[SUCCESS] Phase 3 Bidder facts result saved to: '{phase3_output_file}'")
        else:
            print(f"[FAILURE] Phase 3 Analysis failed: {phase3_result.get('error_message')}")
            sys.exit(1)

        print(f"\n[INFO] Starting Phase 4 Compliance Verification Engine...")
        compliance_engine = ComplianceEngine()

        phase4_result = compliance_engine.evaluate_bid_compliance(
            requirements_input=phase2_result,
            bidder_facts_input=phase3_result
        )

        phase4_json_str = json.dumps(phase4_result, indent=2, ensure_ascii=False)
        print("\n==================================================================")
        print("--- PHASE 4 COMPLIANCE VERIFICATION MATRIX (JSON) ---")
        print("==================================================================")
        print(phase4_json_str)
        print("==================================================================\n")

        phase4_output_file = output_dir / f"{tender_filename}_compliance.json"
        phase4_output_file.write_text(phase4_json_str, encoding="utf-8")
        print(f"[SUCCESS] Phase 4 Compliance matrix saved to: '{phase4_output_file}'")

        print(f"\n[INFO] Starting Phase 5 Risk & Conflict Intelligence Engine...")
        risk_engine = RiskConflictEngine()

        phase5_result = risk_engine.assess_bid_risk(
            facts_input=phase3_result,
            compliance_input=phase4_result
        )

        phase5_json_str = json.dumps(phase5_result, indent=2, ensure_ascii=False)
        print("\n==================================================================")
        print("--- PHASE 5 RISK & CONFLICT INTELLIGENCE ASSESSMENT (JSON) ---")
        print("==================================================================")
        print(phase5_json_str)
        print("==================================================================\n")

        phase5_output_file = output_dir / f"{tender_filename}_risk_assessment.json"
        phase5_output_file.write_text(phase5_json_str, encoding="utf-8")
        print(f"[SUCCESS] Phase 5 Risk assessment result saved to: '{phase5_output_file}'")


# Standard Python CLI launcher entry point
if __name__ == "__main__":
    main()
