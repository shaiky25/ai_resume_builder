## Why

The resume/LinkedIn optimization app needs a single, trusted data layer before any client or backend code can be built against it. Every other layer (chat backend credit gating, frontend live balance display, payment unlock) depends on a consistent set of tables and access rules existing first — most critically, a boundary that makes it structurally impossible for a client to inflate its own credit balance.

## What Changes

- Configure Supabase Auth with Email/Password and Google providers, both producing a `user_id` that all other tables key off of.
- Add a `profiles` table (email, display name, plan tier, created_at) with owner-scoped RLS (read/write where `auth.uid() = user_id`).
- Add a `user_credits` table (free message count remaining, payment success status) with **read-only** RLS for the client — no client-side UPDATE policy exists under any circumstance; the only writer is the service-role key used by the Backend & Security layer's `/api/chat` route.
- Add a `resumes` table storing raw parsed LinkedIn/resume text and Claude's structured output, with owner-scoped RLS (read/write where `auth.uid() = user_id`).
- Add a private Storage bucket for raw uploaded LinkedIn PDFs: owner-scoped INSERT (path-scoped by `user_id`), no public SELECT, read only via short-lived signed URLs generated server-side.
- Enable a Realtime subscription on `user_credits` so the frontend can reflect balance changes the moment the backend decrements them, without routing that read through the backend layer.
- Add a `credit_ledger` table recording every credit reservation/decrement and compensating refund entry, with the same read-only-to-client / service-role-only-write boundary as `user_credits`, so the Backend & Security layer's reserve-before-call / refund-on-failure pattern has somewhere authorized to write.
- Add an `analytics_events` table recording post-stream usage events, service-role-only write, so the Backend & Security layer's post-stream logging has somewhere authorized to write.
- Add a `has_premium_download_access` boolean column on `profiles` (default `false`) that the client can read like the rest of the row but cannot write — a column-level carve-out inside an otherwise owner-writable table, so the Payment layer's idempotent grant has somewhere authorized to write.

## Capabilities

### New Capabilities
- `auth-providers`: Supabase Auth configuration for Email/Password and Google login, producing the `user_id` all other tables key off of.
- `profiles-schema`: `profiles` table schema and owner read/write RLS policy.
- `user-credits-schema`: `user_credits` table schema with owner-read-only / service-role-only-write RLS — the single most important boundary in the system.
- `resumes-schema`: `resumes` table schema (raw text + Claude structured output) and owner read/write RLS policy.
- `linkedin-pdf-storage`: Private Storage bucket for LinkedIn PDFs with owner-scoped INSERT and signed-URL-only read access.
- `user-credits-realtime`: Realtime subscription support on `user_credits` for live balance display.
- `credit-ledger-schema`: `credit_ledger` table schema recording reservations and refunds, with owner-read-only / service-role-only-write RLS.
- `analytics-events-schema`: `analytics_events` table schema recording post-stream usage, service-role-only write.

### Modified Capabilities
- `profiles-schema`: adds a `has_premium_download_access` boolean column (default `false`) that is client-readable but not client-writable, unlike the rest of the `profiles` row.

## Impact

- **Affected systems**: Supabase project configuration (Auth providers, Postgres schema, RLS policies, Storage buckets, Realtime publication).
- **Consumers**: Backend & Security layer (`/api/chat` route; service-role writes to `user_credits`, `credit_ledger`, `analytics_events`), Frontend layer (reads `profiles`, subscribes to `user_credits` via Realtime, requests signed upload URLs for the Storage bucket), Payment layer (service-role write to `profiles.has_premium_download_access`).
- **Out of scope**: the `/api/chat` route's decrement/refund transaction logic itself and what it writes into `credit_ledger`/`analytics_events` beyond the schema and write boundary (only referenced as the sole authorized writer), the payment webhook handler's grant logic itself (only referenced as the sole authorized writer to `has_premium_download_access`), frontend rendering of credit balance or upload UI, Claude prompt/response handling.
- **No breaking changes**: this is the initial data layer. `profiles-schema` is amended in place (not archived yet), so this is an in-flight addition, not a breaking change to shipped behavior.
