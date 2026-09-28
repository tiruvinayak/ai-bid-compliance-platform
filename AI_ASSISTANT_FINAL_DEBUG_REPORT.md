# AI ASSISTANT FINAL DEBUG REPORT

**STATUS: AI ASSISTANT FIXED AND VERIFIED**

---

## 1. Root Cause (confirmed, reproduced, fixed)

**Primary bug — `chat_history` contract mismatch that broke every conversation from the second message onward:**

- The frontend sent `chat_history` as full `AssistantMessage[]` objects. Assistant entries contain a **`citations` array** and a `timestamp` field.
- The Java DTO was `List<Map<String, String>>`, so Jackson rejected the citations **array** where a **String** was expected:
  ```
  400 JSON parse error: Cannot deserialize value of type java.lang.String
  from Array value ... chat_history -> ArrayList[1] -> LinkedHashMap["citations"]
  ```
- Effect: the **first** message succeeded (empty history), **every subsequent message returned 400**, permanently breaking the chat session with an error banner.

**Why it was never caught:** every previous E2E test opened a fresh page and sent exactly **one** message — the broken path was structurally unreachable.

**Secondary bug — LLM output truncation (found during this debug):**
- `num_predict: 2048` cut long answers mid-JSON → `Unterminated string starting at: line 107 column 7 (char 4997)` → `GENERATION_FAILED` ("invalid response format"), and a truncated run could hang a turn for minutes.

**Tertiary issues — citation trust gaps:** model-invented page numbers, inline `[SOURCE: ...]` prose tags ignored by the citations array, over-citing everything on refusal questions, and mangled citation fields (`{"type": "fact-abc-001", "id": "R-001"}`) under concurrent load.

## 2. Root Cause Flow (fixed)

```
UI (BidderAssistant) → complianceService.assistantChat (history sanitized, 180s timeout)
  → POST /api/bids/{bidId}/assistant/chat (Spring, @NotBlank, normalizedChatHistory())
  → AiAssistantService.chat (authorize() isolation, builds context from H2)
  → AiClient (connect 5s / read 300s) → POST /api/ai/bidder-assistant/chat (FastAPI, sync route → threadpool)
  → BidderAssistantService (parse → inline-tag merge → validate → retry → downgrade → refusal guard)
  → Ollama qwen2.5:3b (temp 0.0, num_predict 4096, urlopen 300s)
```

## 3. Files Changed and Why

| File | Change |
|---|---|
| `Frontend/src/services/complianceService.ts` | `chat_history` sanitized to `{role, content}` only; assistant timeout 120s → **180s** |
| `Backend/.../controller/AiAssistantController.java` | DTO widened to `List<Map<String, Object>>` + `normalizedChatHistory()` keeps only non-blank string `role`/`content` (regression-proof against extra fields) |
| `ai-service/.../routes/bidder_assistant.py` | Route `async def` → `def` (threadpool — no event-loop blocking during LLM calls) |
| `ai-service/.../routes/government.py` | Same sync-route fix (shared loop protection) |
| `ai-service/.../llm_client.py` | `num_predict` 2048 → **4096** (no more truncated JSON) |
| `ai-service/.../prompts/bidder_assistant_prompt.py` | New rules: false-premise correction (state ACTUAL status), citations only for sources actually used, refusal → `INSUFFICIENT_EVIDENCE` + empty citations, **< 200-word answers** (anti-truncation) |
| `ai-service/.../bidder_assistant_service.py` | Inline `[SOURCE: ...]` tags extracted → validated → **stripped from display**; authoritative page maps (model pages never trusted); one **nudged retry** on GROUNDED-without-citations and on malformed JSON; citation dedupe; **refusal guard** (refusal text ⇒ `INSUFFICIENT_EVIDENCE` + zero citations); swapped/mangled citation field resolution |

## 4. Verification Matrix

| Requirement | Result | Evidence |
|---|---|---|
| Multi-turn chat works (no 400) | **PASS** | E2E ASST 4: statuses `200,200,200` (was 400 on turn 2) |
| Requirements → GROUNDED + citation chips | **PASS** | 8 requirement citations, pages 1/2/3 correct |
| Bidder fact (GSTIN/turnover) → GROUNDED | **PASS** | `FACT-ABC-001 p1`, `REQ-003 p3`, answer `07AABCT1234F1Z5` / `12.5 crore` |
| Unsupported question → INSUFFICIENT, **0 citations** | **PASS** | Weather: `INSUFFICIENT_EVIDENCE`, `citations: []`, refusal sentence, no fabricated content |
| Citation pages truthful (no invented pages) | **PASS** | Authoritative `page_number` from context; FAB-999 filtered; inline tags stripped |
| Isolation: other bidder → 403 | **PASS** | Bidder B registered E2E → `403 "You cannot access another bidder's submission."` |
| No timeout / no hangs | **PASS** | Final acceptance: all turns **11–25s** (was 60s–593s failures) |
| No UI error banner across flow | **PASS** | 9/9 `Dismiss` count 0 |
| Validation: blank question / no auth / missing bid | **PASS** | 400 `EMPTY_QUESTION` / 403 / 500 `Bid not found` |
| No fabricated page shown from inline tags | **PASS** | Pytest: tag `p.7` → reported page **1** (authoritative) |

## 5. Test Counts (real, all executed)

| Suite | Baseline | New | Total | Status |
|---|---|---|---|---|
| Backend `mvn test` | 49 | +14 (`AiAssistantServiceTest` 7, `AiAssistantControllerTest` 7) | **63** | 63/63 PASS |
| AI `pytest` | 144 | +13 (`test_bidder_assistant.py`) | **157** | 157/157 PASS |
| E2E `playwright` | 40 | +2 net (spec rewritten 3 → 5 workflow tests) | **42** | 42/42 PASS |
| **Total** | **233** | **+29** | **262** | **ALL PASS** |

Frontend `npm run lint`: **0 errors** (9 pre-existing warnings). `npm run build`: **PASS**.

New tests explicitly regression-guard the root causes: citations-array history accepted (pytest + controller test), multi-turn 200s (E2E), 403 isolation (E2E + service test), refusal → 0 citations, page reconciliation, truncated-JSON → retry → `GENERATION_FAILED` fallback.

## 6. Manual Acceptance (real UI, bid GEM-2026-001, logged in as `user@demo.gov.in`)

| # | Question | HTTP | ms | Grounding | Citations |
|---|---|---|---|---|---|
| 1 | What documents are required for this tender? | 200 | 15.8s | GROUNDED | 8 (REQ-001…008, pages 1/2/3) |
| 2 | Is my GST certificate available? | 200 | 11.6s | GROUNDED | 1 (REQ-001 p1) |
| 3 | What is my compliance status? | 200 | 20.6s | GROUNDED | 8 |
| 4 | Why did REQ-003 fail? | 200 | 11.9s | GROUNDED | 1 (REQ-003 p3) — corrects premise, states REVIEW + 12.5 vs 11.8 discrepancy |
| 5 | What is my GSTIN? | 200 | 11.0s | GROUNDED | 1 (FACT-ABC-001 p1) |
| 6 | What is my turnover? | 200 | 14.6s | GROUNDED | 2 (REQ-003 p3 + fact) |
| 7 | Is that sufficient for this tender? | 200 | 20.0s | GROUNDED | 6 (multi-turn follow-up) |
| 8 | Which requirement checks it? | 200 | 14.3s | GROUNDED | 2 |
| 9 | What is the weather on Mars? | 200 | 25.5s | **INSUFFICIENT_EVIDENCE** | **0** |

**FINAL_ACCEPTANCE_ALL_200 = true** — no timeouts, no error banners, no inline `[SOURCE]` tags visible, all statuses correct.
Screenshots: `/tmp/shots/assistant-final-grounded.png`, `/tmp/shots/assistant-final-refusal.png`.

## 7. Final Status

**AI ASSISTANT FIXED AND VERIFIED**

- Multi-turn conversation: **PASS** (root-cause 400 eliminated, regression-tested)
- Grounding + truthful citations: **PASS**
- Unsupported-question refusal: **PASS** (INSUFFICIENT_EVIDENCE, zero citations)
- Security isolation: **PASS** (403 cross-bidder)
- Performance: all turns 11–25s, no truncation, no hangs
- Regression: **262/262 tests pass** (Backend 63, AI 157, E2E 42), lint 0 errors, build PASS
