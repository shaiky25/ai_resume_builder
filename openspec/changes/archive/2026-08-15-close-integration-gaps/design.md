## Context

See proposal.md - Why. Four layers exist and pass their own tests in isolation but were never connected:

- `ChatExperience.tsx` runs entirely on a `window.setTimeout` mock (`MOCK_ASSISTANT_REPLY`, `MOCK_RESUME_DRAFT`, a user-turn counter) and never calls `/api/chat`.
- `handleChatRequest.ts` already implements the full auth → rate-limit → credit-gate → reserve → stream → usage-log/refund pipeline and streams plain text deltas over SSE (`event: message` / `event: done` / `event: error`). It never produces or persists structured resume data — the `resumes.structured_output` column and the `ResumeContextGateway` that reads it back into the next prompt already exist, but nothing writes to it.
- `payment_transactions` / `has_premium_download_access` are only wired into one page: `/payment/processing`, which subscribes via Supabase Realtime (`postgres_changes` on the `app` schema) to confirm a payment already in flight. Nothing elsewhere in the UI reads `has_premium_download_access`, and no UI element can start a checkout.
- `ExportControls`/`PreviewPane` gate purely on `isResumeReady`, sourced from the mock's turn counter.

## Goals / Non-Goals

**Goals:**
- Make the chat UI a real client of `/api/chat`, including its error states.
- Give the live preview and export gate a real data source: persisted structured resume data and the real `has_premium_download_access` flag.
- Give users a way to actually reach checkout.
- Reuse the Realtime pattern already established for `payment_transactions` (and specified for `user_credits`) rather than inventing a new read path.

**Non-Goals:**
- Choosing or changing the payment provider, pricing, or credit/rate-limit behavior.
- Redesigning the Master Prompt or the chat UX beyond wiring it to the real endpoint.
- A dedicated "structured extraction quality" evaluation harness — correctness of extracted fields is a prompt-tuning concern, not part of this wiring change.

## Decisions

**1. Structured resume extraction runs as a second, separate Claude call after the text stream completes — not interleaved in the SSE text stream.**
`handleChatRequest.ts` already has a clean post-stream hook (where `usageLogger.logSuccess` runs today, right before `event: done`). Adding a second `modelClient` call there — using Claude's tool-use/structured-output mode against a fixed resume-fields tool schema, seeded with the full conversation — keeps the existing `chat-response-streaming` contract completely untouched (matches the proposal's "no modified capabilities"). Alternative considered: emit structured JSON fragments inline in the same SSE stream (e.g. a `resume_patch` event type). Rejected because it requires either a second concurrent model call multiplexed into one stream, or parsing partial JSON out of incremental text deltas — both add real complexity for no behavior the proposal actually needs, since the frontend can read persisted state via Realtime instead of via the stream.

**2. Extraction failures are logged and swallowed, never surfaced to the chat turn.**
The chat response has already been delivered to the client by the time extraction runs. Per the `resume-structured-extraction` spec, a failed extraction must not fail the turn. This mirrors the existing refund-on-failure discipline elsewhere in `handleChatRequest.ts`, just without a refund step (a credit was correctly spent on a successful chat turn regardless of extraction outcome).

**3. Frontend reads `resumes.structured_output` and `has_premium_download_access` via Supabase Realtime, not polling.**
This is the same mechanism already implemented in `/payment/processing/page.tsx` (`supabase.channel(...).on("postgres_changes", ...)`) and already specified for credits in `user-credits-realtime`. Using it here keeps one read pattern across the app instead of introducing polling as a second one. Both are owner-scoped by existing RLS, so no new access-control surface is introduced.

**4. `isResumeReady` becomes "has the persisted `structured_output` reached a usable shape" instead of "N user turns have passed."**
The `resume-preview-pane` capability's contract (`isResumeReady` owned by the parent page) is unchanged — only what the parent page bases that boolean on changes, which is why `resume-preview-pane` is not listed as a modified capability. "Usable shape" is an implementation-level check (e.g. name + at least one experience entry present) rather than a new spec-level contract, so it is left as a task-level detail rather than a scenario.

**5. Export gating combines readiness AND `has_premium_download_access` client-side; the export action itself remains unauthenticated at the API layer (client-side PDF/DOCX generation, per `frontend-chat-ui`).**
No new server-side enforcement is added in this change — the existing architecture already treats export as a client-side operation gated by UI state. Hardening that into a server-checked entitlement (so a user can't bypass the UI gate via devtools) is a real gap but is a separate, larger concern (would need a server-side export endpoint) and is called out under Risks below rather than folded into this wiring change.

## Risks / Trade-offs

- [Extraction call adds latency/cost after every turn] → It runs after the user-visible stream has already closed, so it doesn't add perceived latency to the chat response; cost is bounded by the same conversation length already sent to the main call.
- [Extraction call could fail silently and leave the preview stale with no user-visible signal] → Log failures server-side (consistent with existing `console.error` usage in `handleChatRequest.ts`); the preview simply stays on its last-known-good `structured_output` until the next successful turn, which is acceptable since nothing regresses.
- [Client-side export gate can be bypassed via devtools, undermining the payment gate] → Out of scope for this change (see Decision 5); flagged here so it's an explicit, tracked trade-off rather than an oversight.
- [Realtime channel proliferation: chat preview, credits, and payment status each open their own channel] → Matches the existing per-concern channel pattern already used for `payment_transactions`; not a new problem introduced by this change.

## Migration Plan

No data migration required — `resumes.structured_output` and `profiles.has_premium_download_access` already exist. Rollout is additive: land the backend extraction step, then the frontend wiring (chat, preview, export gate, checkout entry point) behind normal code review/deploy, no feature flag needed since the mock it replaces has no production users depending on its specific mocked values.
