# MISSING BID 404 FIX REPORT

**FINAL STATUS: MISSING BID 404 FIXED AND FULL REGRESSION PASSED**

## Root Cause

Two lines combined to turn a missing bid into a 500:

1. `AiAssistantService.chat()` (line 72) threw a plain **`IllegalArgumentException("Bid not found: " + bidId)`** when `bidRepository.findByBidId(bidId)` returned `Optional.empty()`.
2. `AiAssistantController.chat()` has a broad **`catch (RuntimeException e)`** fallback that returns `ResponseEntity.internalServerError()` with envelope `{"success": false, "error_code": "ASSISTANT_SERVICE_ERROR", "message": "AI assistant service failed: ..."}` — it caught the `IllegalArgumentException` before Spring's `GlobalExceptionHandler` could see it.

The project's `GlobalExceptionHandler` **already had** the correct convention in place — a dedicated `@ExceptionHandler(ResponseStatusException.class)` whose comment literally says *"Preserves ResponseStatusException's intended status (e.g. 404 for unknown bids/sectors/tenders)"*, and sibling services (`HierarchyService`, `MlRiskService`, `GovernmentVerificationService`) already throw `ResponseStatusException(HttpStatus.NOT_FOUND, ...)`. The AI Assistant path was the only one not using it, and the controller's `RuntimeException` catch swallowed it first.

Reproduced before the fix:
```
HTTP/1.1 500
{"message":"AI assistant service failed: Bid not found: GEM-9999-999",
 "error_code":"ASSISTANT_SERVICE_ERROR","success":false}
```

## File Changed

| # | File | Change |
|---|---|---|
| 1 | `Backend/src/main/java/com/sih/gem/service/AiAssistantService.java` | Missing-bid lookup now throws `ResponseStatusException(HttpStatus.NOT_FOUND, "Bid not found: " + bidId)` instead of `IllegalArgumentException` (matches `HierarchyService`/`MlRiskService` convention) |
| 2 | `Backend/src/main/java/com/sih/gem/controller/AiAssistantController.java` | Added `catch (org.springframework.web.server.ResponseStatusException e) { throw e; }` between the `AccessDeniedException` rethrow and the `AiClientException` catch, so the 404 reaches `GlobalExceptionHandler` instead of collapsing into the `RuntimeException` → 500 branch |
| 3 | `Backend/src/test/java/com/sih/gem/service/AiAssistantServiceTest.java` | `missingBidThrowsNotFound` updated to the new contract (`ResponseStatusException`, status 404, reason contains "Bid not found"); **new** endpoint-level test `missingBidReturns404WithCleanJsonAndNoAiCall` (standalone MockMvc + real service + `GlobalExceptionHandler` advice) |

No other code touched: no LLM/Ollama/FastAPI/prompt/citation/chat-history/grounding/refusal/RAG/frontend changes.

## Fix (smallest correct fix)

Reused the project's existing exception architecture — the existing `GlobalExceptionHandler.ResponseStatusException` handler (which already renders `{"error": msg, "message": msg}` with the intended status) — and made the two touch points on the AI Assistant path actually use it:

- Service: `IllegalArgumentException` → `ResponseStatusException(NOT_FOUND, "Bid not found: <id>")`
- Controller: rethrow `ResponseStatusException` just like the existing `AccessDeniedException` rethrow

Lookup order is unchanged (bid lookup → authorize → context → AI), so authorization behavior is untouched; the exception is thrown **before** `authorize()`, and only when the bid genuinely does not exist — `Optional.empty()` is the sole trigger. No blanket `catch (Exception) → 404`.

## HTTP Contract (verified live against `POST /api/bids/{bidId}/assistant/chat`)

| Case | Expected | Actual | Result |
|---|---|---|---|
| Existing bid (owner, valid question) | 200 | **200** — `GROUNDED`, `FACT-ABC-001 p1`, answer `07AABCT1234F1Z5` | **PASS** |
| Unauthenticated (no token) | 403 | **403** | **PASS** |
| Wrong bidder (re-registered bidder B → bid 001) | 403 | **403** `{"message":"Access Denied: You cannot access another bidder's submission."}` | **PASS** |
| Blank question | 400 | **400** `{"fieldErrors":{"question":"must not be blank"},...}` | **PASS** |
| Missing bid `GEM-9999-999` | 404 | **404** `{"message":"Bid not found: GEM-9999-999","error":"Bid not found: GEM-9999-999"}` | **PASS** |
| Missing bid + wrong bidder | 404 | **404** (lookup precedes authorize; no data exposed) | **PASS** |
| Valid AI Assistant request | 200 | **200** | **PASS** |

404 body is the project's standard `{error, message}` JSON — no stack trace, no exception class names, no `error_code` 500 envelope, no DB/internal details (asserted in the new test).

## Regression Tests

| Suite | Result |
|---|---|
| Backend `mvn test` | **64/64 PASS** (63 prior + 1 new; `AiAssistantServiceTest` now 8 tests) |
| AI `pytest` | **157/157 PASS** |
| E2E `npx playwright test` | **42/42 PASS** |
| Lint `npm run lint` | **PASS** — 0 errors (9 pre-existing warnings) |
| Build `npm run build` | **PASS** |

New regression test (`missingBidReturns404WithCleanJsonAndNoAiCall`) verifies via the real endpoint chain: authenticated valid user + non-existent bid → **HTTP 404**, body contains "Bid not found", **no** exception class/stack frames/`error_code` leak, **no 500**, `aiClient` never called (no LLM call), no audit row written. The other contract points remain covered by existing tests (`unauthorizedBidderIsRejected` → 403, `blank question` → 400, `validGroundedResponsePassesThrough` → 200) — no expectations were weakened, deleted, or skipped.

## AI Acceptance

**9/9 PASS** (real UI, bid GEM-2026-001):

| # | Question | HTTP | Grounding | Citations |
|---|---|---|---|---|
| 1 | What documents are required for this tender? | 200 | GROUNDED | 8 |
| 2 | Is my GST certificate available? | 200 | GROUNDED | 1 |
| 3 | What is my compliance status? | 200 | GROUNDED | 8 |
| 4 | Why did REQ-003 fail? | 200 | GROUNDED | 1 |
| 5 | What is my GSTIN? | 200 | GROUNDED | 1 |
| 6 | What is my turnover? | 200 | GROUNDED | 2 |
| 7 | Is that sufficient for this tender? (multi-turn) | 200 | GROUNDED | 6 |
| 8 | Which requirement checks it? | 200 | GROUNDED | 2 |
| 9 | What is the weather on Mars? | 200 | INSUFFICIENT_EVIDENCE | **0** |

Plus contract spot-checks: valid → 200, unauthenticated → 403, wrong bidder → 403, blank question → 400, **missing bid → 404**.

## FINAL STATUS

**MISSING BID 404 FIXED AND FULL REGRESSION PASSED**
