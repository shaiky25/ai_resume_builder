## Why

Every layer has been built and archived independently (auth, chat backend security, DB schema, payments, frontend chat UI) but the pieces were never wired to each other: the production chat UI still runs entirely on a client-side mock instead of calling the real `/api/chat` endpoint, nothing derives or persists structured resume data from a conversation so the live preview has no real data source, and the payment layer has no UI entry point and is never consulted when gating downloads. The app cannot be used end-to-end today even though each layer passes its own tests in isolation.

## What Changes

- Replace the mocked send/receive loop in the chat UI with real calls to `/api/chat`, consuming the existing SSE contract (`event: message` text deltas, `event: done`, `event: error`) and surfacing the existing error statuses (401, 429, 403 `out_of_credits`, 500, 502) to the user.
- Add structured resume extraction: after a chat turn, derive structured resume data from the conversation and persist it to the existing `resumes.structured_output` column so it can be read back on the next turn (already consumed by `promptComposer`) and by the frontend.
- Add a real-time/polling read path so the frontend's `resumeDraft`/`isResumeReady` state is driven by persisted `resumes.structured_output` instead of a hardcoded mock object and a turn-count timer.
- Add a checkout entry point in the product UI (e.g. an "Unlock downloads" affordance) that calls the existing checkout-session-creation endpoint — today nothing in the UI can start a checkout.
- Add a premium-download gate: subscribe to (or poll) the authenticated user's `has_premium_download_access` flag and use it, alongside resume-readiness, to control whether PDF/DOCX export is enabled — today `ExportControls` is gated only on resume-readiness and never looks at payment state.

## Capabilities

### New Capabilities
- `chat-live-integration`: The production chat UI sends real messages to `/api/chat` and renders the SSE stream incrementally, replacing the mocked send/receive loop, including surfacing the backend's existing error responses (rate limit, out of credits, server/model errors).
- `resume-structured-extraction`: After a chat turn, the system derives structured resume data from the conversation and persists it to `resumes.structured_output`, scoped to the authenticated user.
- `premium-download-gate`: The frontend reads the authenticated user's `has_premium_download_access` flag and uses it to gate PDF/DOCX export, in addition to resume-readiness.
- `checkout-entry-point`: A UI affordance lets an authenticated user initiate the existing checkout-session-creation flow from within the product.

### Modified Capabilities
(none — the existing `chat-response-streaming`, `resume-preview-pane`, `checkout-session-creation`, and `payment-succeeded-handling` requirements are unchanged; this change consumes them from a real client for the first time rather than altering their contracts)

## Impact

- **Affected code**: `ChatExperience.tsx` (replace mock send loop with real `/api/chat` client), a new resume-extraction step in or alongside `handleChatRequest.ts`'s post-stream path, `PreviewPane`/`ExportControls` (read `resumes.structured_output` and `has_premium_download_access` instead of mock/readiness-only state), a new checkout-trigger UI component wired to `POST /api/payments/checkout`.
- **Dependencies**: builds directly on `backend-security-layer`, `frontend-chat-ui`, `db-layer-data-management`, and `payment-gatekeeping` — no new schema is required; `resumes.structured_output` and `profiles.has_premium_download_access` already exist.
- **Out of scope**: choice of extraction technique's underlying prompt/model strategy beyond "derive structured resume data from the conversation" (left to design.md), any new payment provider work, and any new credit/rate-limit behavior (unchanged).
- **No breaking changes**: additive wiring between already-shipped layers; no existing API contracts change shape.
