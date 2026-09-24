"""
===============================================================================
MODULE: app/prompts/bidder_assistant_prompt.py
===============================================================================
PURPOSE:
    Provides system and user prompts for the Bidder AI Assistant chat endpoint.
    This assistant helps bidders understand their tender requirements and their
    submission status using grounded, evidence-based responses.

WHAT IT DOES:
    - Defines BIDDER_ASSISTANT_SYSTEM_PROMPT instructing the LLM to answer
      bidder questions using ONLY the provided tender/bid context.
    - Enforces strict grounding: NO hallucination, NO invented requirements,
      NO invented documents, NO invented compliance decisions.
    - Requires citations for every factual claim.
    - Supports question categories: requirements, missing docs, doc problems,
      compliance explanation, submission guidance, status.

HOW IT FITS INTO THE PIPELINE:
    BidderAssistantService -> build_assistant_prompt() -> LLM Client -> Grounded Response + Citations
===============================================================================
"""

# standard library imports
import json
from typing import Any, Dict, List, Optional

BIDDER_ASSISTANT_SYSTEM_PROMPT = """
You are an AI Procurement Assistant helping a bidder understand their tender requirements and submission status.

YOUR ROLE:
Answer the bidder's questions using ONLY the provided tender/bid context. You are a guide, not a decision-maker.

STRICT RULES — NO HALLUCINATION:
1. ANSWER ONLY FROM PROVIDED CONTEXT:
   - Use ONLY the tender requirements, bidder facts, compliance results, preliminary verification, and evidence provided in the context.
   - Do NOT invent tender requirements, documents, compliance decisions, dates, or page numbers.
   - Do NOT claim a document exists unless it is present in the context.

2. GROUNDING REQUIREMENT:
   - Every factual claim in your answer MUST be supported by a citation from the provided context.
   - If the context does not contain sufficient evidence to answer, explicitly say: "I could not find supporting evidence in the available tender/bid documents."
   - Do NOT use external knowledge, legal databases, or government websites as sources.

3. CITATION REQUIREMENT:
   - For every factual statement, include a citation in the format: [SOURCE: type, id, page]
   - Examples: [SOURCE: requirement, R-01], [SOURCE: fact, FACT-001, p.2], [SOURCE: compliance, R-03], [SOURCE: preliminary, EXPIRY_DATE], [SOURCE: evidence, R-01, p.2]
   - Only cite sources that are actually provided in the context.

4. NO LEGAL/FINAL DECISIONS:
   - Do NOT say "Your bid will be accepted/rejected" or "You are legally compliant/non-compliant".
   - Use phrasing like: "Based on the available tender requirements...", "The system currently identifies...", "The available evidence indicates...", "This item may require officer review."
   - The final procurement decision remains with the authorized government officer.

5. DOCUMENT/COMPLIANCE STATUS:
   - Use the exact statuses from the context: PASS, FAIL, REVIEW, MISSING, CONFLICT, PASS/FAIL/REVIEW/MISSING/CONFLICT
   - Do NOT invent new statuses.

6. QUANTITY/UNIT NORMALIZATION:
   - Use the exact values from the context (e.g., "INR 7 Crore" -> 70000000 INR).
   - Do NOT invent or convert numbers not present in the context.

7. AMBIGUITY HANDLING:
   - If the context contains ambiguous information (e.g., "adequate experience" without a number), do NOT invent a number.
   - Say: "The requirement states 'adequate experience' without a specific number. The available evidence indicates..."

RESPONSE FORMAT:
Return a valid JSON object with:
{
  "answer": "Your natural language answer with inline citations like [SOURCE: requirement, R-01]",
  "citations": [
    {"type": "requirement", "id": "R-01", "page": null},
    {"type": "fact", "id": "FACT-001", "page": 2}
  ],
  "grounding_status": "GROUNDED" | "INSUFFICIENT_EVIDENCE"
}

If the context is insufficient, set grounding_status to "INSUFFICIENT_EVIDENCE" and provide a helpful answer explaining what evidence is missing.
"""

def build_assistant_prompt(
    question: str,
    tender_context: Dict[str, Any],
    bid_context: Dict[str, Any],
    requirements: List[Dict[str, Any]],
    bidder_facts: List[Dict[str, Any]],
    compliance_results: List[Dict[str, Any]],
    preliminary_verification: List[Dict[str, Any]],
    evidence: List[Dict[str, Any]],
    risk_conflicts: List[Dict[str, Any]],
    chat_history: Optional[List[Dict[str, str]]] = None
) -> str:
    """
    Constructs the formatted user prompt sent to the LLM for the bidder assistant.
    """
    
    # Format requirements context
    req_lines = []
    for req in requirements:
        req_id = req.get("requirement_id") or req.get("id") or "REQ-???"
        cat = req.get("category", "")
        desc = req.get("description") or req.get("requirement", "")
        req_val = req.get("required_value", "")
        req_lines.append(f"- [{req_id}] ({cat}) {desc} | Required: {req_val}")
    req_context = "\n".join(req_lines) if req_lines else "No requirements found in context."

    # Format bidder facts context
    fact_lines = []
    for fact in bidder_facts:
        fact_id = fact.get("fact_id", "FACT-???")
        cat = fact.get("category", "")
        field = fact.get("field", "")
        val = fact.get("detected_value", "")
        unit = fact.get("unit", "")
        page = fact.get("page_number", "?")
        doc = fact.get("source_document", "")
        fact_lines.append(f"- [{fact.get('fact_id','FACT-???')}] ({cat}/{field}) {val} {unit} — {doc} p.{page}")
    fact_context = "\n".join(fact_lines) if fact_lines else "No bidder facts extracted yet."

    # Format compliance results context
    comp_lines = []
    for comp in compliance_results:
        req_id = comp.get("requirement_id", "REQ-???")
        status = comp.get("status", "UNKNOWN")
        detected = comp.get("detected_value", "")
        comp_lines.append(f"- [{req_id}] Status: {status} | Detected: {detected}")
    comp_context = "\n".join(comp_lines) if comp_lines else "No compliance results available."

    # Format preliminary verification context
    prelim_lines = []
    for pv in preliminary_verification:
        check_type = pv.get("checkType") or pv.get("check_type", "")
        status = pv.get("status", "")
        msg = pv.get("message", "")
        prelim_lines.append(f"- [{check_type}] Status: {status} | {msg}")
    prelim_context = "\n".join(prelim_lines) if prelim_lines else "No preliminary verification results available."

    # Format evidence context
    ev_lines = []
    for ev in evidence:
        req_id = ev.get("requirementId") or ev.get("requirement_id", "REQ-???")
        decision = ev.get("decision", "")
        page = ev.get("pageNumber") or ev.get("page_number", "?")
        doc = ev.get("sourceDocument") or ev.get("source_document", "")
        ev_lines.append(f"- [{req_id}] Decision: {decision} | {doc} p.{page}")
    ev_context = "\n".join(ev_lines) if ev_lines else "No evidence details available."

    # Format risk/conflicts
    risk_lines = []
    for rc in risk_conflicts:
        risk_type = rc.get("risk_type") or rc.get("type", "")
        severity = rc.get("severity", "")
        req_id = rc.get("requirement_id", "")
        reason = rc.get("reason", "")
        risk_lines.append(f"- [{risk_type}] {severity} | {req_id}: {reason}")
    risk_context = "\n".join(risk_lines) if risk_lines else "No risk/conflict data available."

    # Format chat history
    history_str = ""
    if chat_history:
        history_lines = []
        for msg in chat_history[-6:]:  # Last 6 messages for context
            role = msg.get("role", "user")
            content = msg.get("content", "")
            history_lines.append(f"{role}: {content}")
        history_str = "\n".join(history_lines)

    prompt = f"""
BIDDER QUESTION:
{question}

CONVERSATION HISTORY:
{history_str if history_str else "No previous messages."}

TENDER CONTEXT:
- Tender ID: {tender_context.get('tenderId', 'Unknown')}
- Tender Title: {tender_context.get('tenderTitle', 'Unknown')}
- Category: {tender_context.get('category', 'Unknown')}

BID CONTEXT:
- Bid ID: {bid_context.get('bidId', 'Unknown')}
- Bidder: {bid_context.get('bidderName', 'Unknown')}
- Status: {bid_context.get('status', 'Unknown')}
- Compliance: {bid_context.get('compliancePercentage', 'N/A')}%

TENDER REQUIREMENTS:
{req_context}

BIDDER FACTS (EXTRACTED FROM SUBMITTED DOCUMENTS):
{fact_context}

COMPLIANCE RESULTS:
{comp_context}

PRELIMINARY VERIFICATION:
{prelim_context}

EVIDENCE DETAILS:
{ev_context}

RISK / CONFLICT INTELLIGENCE:
{risk_context}

INSTRUCTIONS:
1. Answer the bidder's question using ONLY the context above.
2. Every factual claim MUST include a citation: [SOURCE: type, id, page]
3. If evidence is insufficient, explicitly state so.
4. Do NOT make compliance decisions (PASS/FAIL/APPROVE/REJECT).
5. Do NOT invent requirements, documents, or page numbers.
6. Return ONLY a valid JSON object with: answer, citations, grounding_status
"""
    return prompt