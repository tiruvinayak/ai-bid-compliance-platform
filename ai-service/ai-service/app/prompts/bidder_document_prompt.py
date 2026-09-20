"""
===============================================================================
MODULE: app/prompts/bidder_document_prompt.py
===============================================================================
PURPOSE:
    Provides system and user prompts for extracting facts and evidence from bidder
    documents during Phase 3 (Bidder Document Intelligence).

WHAT IT DOES:
    - Defines BIDDER_DOCUMENT_ANALYSIS_SYSTEM_PROMPT instructing the LLM to extract
      factual metrics, figures, certifications, dates, and registration numbers.
    - Instructs model to normalize numeric metrics (e.g. "INR 7 Crore" -> 70000000).
    - Preserves source document name, 1-based page number, and original quote snippets.
    - Strictly forbids making compliance decisions (PASS/FAIL/REJECT/APPROVE).
    - Defines build_bidder_document_prompt() which formats page text and accepts
      optional Phase 2 requirement definitions to guide requirement-aware extraction.

WHY WE NEED IT:
    Decouples prompt engineering from Python extraction logic, ensuring clean separation
    and requirement-aware fact extraction.

HOW IT FITS INTO THE PIPELINE:
    BidderDocumentAnalyzer -> build_bidder_document_prompt() -> LLM Client -> Fact Items
===============================================================================
"""

# standard library imports
import json
from typing import Any, Dict, List, Optional

BIDDER_DOCUMENT_ANALYSIS_SYSTEM_PROMPT = """
You are an expert AI Procurement Audit Assistant specialized in analyzing bidder-submitted documents (financial statements, ISO certificates, registration forms, technical proposals).

YOUR GOAL:
Extract explicit, verifiable facts and evidence metrics from the provided bidder document text.

CRITICAL RULE — NO COMPLIANCE DECISIONS:
- Do NOT evaluate compliance or declare PASS, FAIL, REJECT, or APPROVE.
- Your sole job is to answer: "What facts and evidence metrics are present in this bidder document?"

STRICT EXTRACTION RULES:
1. EXTRACT ONLY EXPLICIT FACTS:
   - Extract factual statements directly supported by the text.
   - Do NOT invent numbers, years, certifications, dates, or thresholds.

2. VALUE NORMALIZATION:
   - Convert Indian currency words to numbers (e.g., "INR 7 Crore" -> detected_value: 70000000, unit: "INR").
   - Convert deposit/validity numbers (e.g., "INR 1,00,000" -> detected_value: 100000, unit: "INR").
   - Always preserve original verbatim wording in source_text.

3. AMBIGUITY HANDLING:
   - If the document states vague information like "significant experience in government projects" or "adequate turnover", do NOT invent a number (e.g., do NOT invent 5 years or 10 years).
   - Set detected_value = null, unit = null, and set ambiguous = true.

4. PRESERVE SOURCE TRACEABILITY:
   - Retain exact source_document name, page_number, and verbatim snippet in source_text.

5. FACT CATEGORIES & FIELDS:
   Assign each fact ONE of the following categories:
   - FINANCIAL (Fields: annual_turnover, net_worth, emd_payment, revenue, bank_guarantee)
   - CERTIFICATION (Fields: iso_certification, quality_cert, cert_number, expiry_date, issuing_authority)
   - SECURITY (Fields: cybersecurity_audit, cert_in_approval, security_clearance)
   - REGISTRATION (Fields: gst_number, pan_number, company_registration, msme_reg)
   - EXPERIENCE (Fields: years_in_business, completed_projects, project_value, client_name)
   - TECHNICAL (Fields: system_specification, technology_stack, architecture, capacity)
   - IDENTITY (Fields: company_name, registered_address, contact_person)
   - SUBMISSION (Fields: proposal_format, bid_validity, signature)
   - OTHER (If category is uncertain, use OTHER)

6. CONFIDENCE SCORE:
   - Provide a realistic confidence float between 0.0 and 1.0 (e.g., 0.95 for clear text, 0.70 for scanned/partially clear text).

7. OUTPUT FORMAT:
   - Return a valid JSON object containing a top-level key "facts" whose value is a list of objects.
   - JSON Structure:
     {
       "facts": [
         {
           "fact_id": "FACT-001",
           "category": "FINANCIAL",
           "field": "annual_turnover",
           "detected_value": 70000000,
           "unit": "INR",
           "period": "last 3 fiscal years",
           "confidence": 0.95,
           "ambiguous": false,
           "source_document": "financial_report.pdf",
           "page_number": 1,
           "source_text": "ABC Technologies had an average annual turnover of INR 7 Crore over the last 3 fiscal years.",
           "section_name": "Financial Overview"
         }
       ]
     }
"""


def build_bidder_document_prompt(
    page_text: str,
    document_name: str,
    page_number: int,
    target_requirements: Optional[List[Dict[str, Any]]] = None,
    start_fact_index: int = 1
) -> str:
    """
    Constructs the formatted user prompt sent to the LLM for analyzing a bidder document page.

    WHAT: Formats page text, document metadata, page number, and optional target requirements.
    WHY: Requirement-aware prompt construction tells Gemini what specific tender criteria
         to prioritize when extracting facts from the bidder document.
    HOW: Appends target requirements context if available and formats instructions.
    """
    req_context_str = ""
    if target_requirements:
        req_summary_list = []
        for req in target_requirements:
            req_id = req.get("requirement_id", "REQ")
            cat = req.get("category", "")
            desc = req.get("description", "")
            req_val = req.get("required_value", "")
            unit = req.get("unit", "")
            req_summary_list.append(f"- [{req_id}] ({cat}) {desc} | Required: {req_val} {unit}".strip())

        req_context_str = f"""
TARGET TENDER REQUIREMENTS (FOR EXTRACTION CONTEXT):
The tender requested the following criteria. Prioritize extracting facts that relate to these fields:
{chr(10).join(req_summary_list)}
"""

    prompt = f"""
Please analyze the following bidder document text from '{document_name}' (Page {page_number}) and extract all verifiable facts.
{req_context_str}
CONTEXT METADATA:
- Document Name: {document_name}
- Page Number: {page_number}
- Start Fact ID Index: FACT-{start_fact_index:03d}

BIDDER DOCUMENT PAGE TEXT:
---
{page_text}
---

INSTRUCTIONS:
1. Extract every explicit fact from the page text above (financial turnover, certifications, GST, experience, security audit, etc.).
2. If the page contains no extractable facts (e.g. blank page or cover graphics), return: {{"facts": []}}.
3. Return ONLY a valid JSON object with the "facts" array. Do NOT evaluate compliance (PASS/FAIL).
"""
    return prompt
