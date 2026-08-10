## Why

The Anthropic API key, the Impact-Writer Master Prompt, and the credit ledger all need a single trusted server-side chokepoint so the client can never reach Claude directly, never see the hidden prompt, and never mutate its own credit balance. Without this route, every other layer (frontend chat, payment unlock) has nothing safe to call.

## What Changes

- Add a single Next.js serverless Route Handler, `POST /api/chat`, that proxies all Claude calls.
- Require a valid Supabase JWT (verified server-side, not a client-passed user ID) before any other logic runs.
- Add a hard credit gate: read `credits_remaining` for the authenticated user; return 403 Forbidden immediately with no Claude call and no charge if insufficient.
- Reserve/decrement the credit **before** opening the Claude stream (not after), to prevent concurrent-request races past the check; refund via a compensating ledger entry if the Claude call errors or the connection drops mid-stream.
- Assemble the hidden Impact-Writer Master Prompt server-side and append the user's LinkedIn/resume context (pulled from Supabase, never trusted from client input); this composed prompt is never exposed in client-visible request or response payloads.
- Stream Claude's response back to the client (SSE or ReadableStream).
- On stream completion, write an analytics event and a ledger entry reflecting actual usage, regardless of whether it matches the reserved amount exactly.
- Add per-user rate limiting independent of credit balance, to stop burst abuse even from users who have credits.

## Capabilities

### New Capabilities
- `chat-request-authentication`: JWT-authenticated request handling for `POST /api/chat`; rejects unauthenticated requests before any other logic runs.
- `chat-credit-gate`: Hard-stop credit check returning 403 Forbidden with no Claude call and no charge when the user is at or below their cap.
- `chat-credit-reserve-refund`: Reserve-before-call / refund-on-failure transaction pattern around the Claude call.
- `chat-system-prompt-injection`: Server-side assembly of the Impact-Writer Master Prompt plus LinkedIn/resume context, fully hidden from client-visible payloads.
- `chat-response-streaming`: Streaming proxy of Claude's response back to the client.
- `chat-usage-logging`: Post-stream ledger and analytics logging of actual usage.
- `chat-rate-limiting`: Per-user rate limiting independent of the credit balance check.

### Modified Capabilities
(none — this is the first change establishing the backend layer)

## Impact

- **Affected code**: new route at `/api/chat`; holds the Anthropic API key and the Supabase service-role key server-side only.
- **Consumes**: the Data & Management layer's `user_credits` table (read), and `credit_ledger`/`analytics_events` tables (write via service-role) — all defined by `db-layer-data-management`.
- **Consumed by**: the Frontend layer, which calls this route via `fetch`/`EventSource` and must treat a 403 as a "show upgrade/out-of-credits" UI state, not a generic error.
- **Out of scope**: frontend rendering of streamed tokens, Supabase schema/RLS policy definitions (referenced as a dependency), the Claude API request/response contract itself (model choice, max_tokens, prompt template internals) beyond noting this route is where they're configured.
- **Dependencies/assumptions on other layers**: expects `user_credits`, `credit_ledger`, and `analytics_events` tables already defined by the Data & Management layer, with RLS preventing client-side writes to any of them (service-role key only). Satisfied by `db-layer-data-management`, which defines all three with this exact boundary.
