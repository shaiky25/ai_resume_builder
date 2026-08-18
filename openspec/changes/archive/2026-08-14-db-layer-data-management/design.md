## Context

See proposal.md - Why. This design covers the Supabase configuration (Auth, Postgres schema + RLS, Storage, Realtime) that every other layer depends on. No backend or frontend code exists yet; this is greenfield.

## Goals / Non-Goals

**Goals:**
- Make it structurally impossible (not just policy-discouraged) for a client to write to `user_credits`.
- Give the frontend everything it needs to read directly (profiles, live credit balance) without proxying through the backend.
- Keep uploaded LinkedIn PDFs private by default, accessible only through short-lived signed URLs.

**Non-Goals:**
- Defining the `/api/chat` route's decrement/refund transaction logic itself, or what it writes into `credit_ledger`/`analytics_events` beyond schema and write boundary (Backend & Security layer).
- Defining the payment webhook handler's grant logic itself (Payment layer's concern; this change only adds the `has_premium_download_access` column and its write boundary).
- Any frontend rendering or upload UI.

## Decisions

- **RLS everywhere, no exceptions**: `profiles`, `user_credits`, and `resumes` all get `auth.uid() = user_id` policies. Alternative considered: application-layer authorization only — rejected because a single missed check in any future client code path would leak or corrupt data; RLS makes the boundary enforced at the database regardless of application bugs.
- **`user_credits` has zero client-side write policies**, not a restrictive one. Alternative considered: a client UPDATE policy restricted to decrementing-only via a check constraint — rejected as unnecessarily fragile (check constraints are easy to get wrong and don't stop a user from reading service internals); simplest and safest is no client write path to this table at all. Every write goes through the service-role key inside `/api/chat`.
- **Storage bucket uses path-scoped ownership (`{user_id}/...`) enforced by policy**, not bucket-per-user. Alternative considered: separate buckets per user — rejected as unnecessary operational overhead; a single bucket with a path-prefix policy achieves the same isolation with standard Supabase Storage policies.
- **Realtime is scoped by the same RLS as reads**, so no separate authorization layer is needed for the subscription — Supabase Realtime enforces RLS on `postgres_changes` subscriptions by default for the anon/authenticated roles.
- **`credit_ledger` and `analytics_events` follow the exact same read-only/service-role-write pattern as `user_credits`**, rather than each inventing their own access model. Alternative considered: no client read access at all (service-role-only read too) — rejected for `credit_ledger` and `analytics_events` alike, for consistency with the rest of this data layer and because owner-readable usage/ledger history is unremarkable to expose (it's the write path, not the read path, that's security-critical) and may be useful for a future "usage history" UI.
- **All application tables/functions live in a dedicated `app` Postgres schema, not `public`.** Discovered live during implementation: Supabase provisions `alter default privileges ... grant all on tables to anon, authenticated, service_role` for the `public` schema specifically at project creation, applied automatically to any table created there — independent of and prior to any migration-defined grant. This defeated the column-level `REVOKE`/narrow-`GRANT` restriction on `profiles.has_premium_download_access` below (verified live: a bundled `authenticated` UPDATE touching that column succeeded despite the narrower column grant, because a privilege check passes if *either* the table-wide default grant or the column grant permits it). `app` gets no such default grant, so every table there starts deny-by-default. Requires exposing `app` under Data API > Exposed Schemas in the dashboard (not settable via SQL/migration) and configuring the service-role client with `db: { schema: "app" }`.
- **`has_premium_download_access` is a column-level carve-out inside an otherwise owner-writable `profiles` row, not a separate table.** Alternative considered: a separate `premium_access` table (like `user_credits`) — rejected as unnecessary; there's exactly one boolean, and splitting it out would just add a join for every place that needs to check it. Postgres RLS is row-level, not column-level, so a single table-level RLS policy cannot by itself let an owner write `display_name` but not `has_premium_download_access`. Implementation SHALL enforce this with one of: (a) column-level `REVOKE UPDATE (has_premium_download_access) ON profiles FROM authenticated` alongside the existing row-level owner-write policy, or (b) a `BEFORE UPDATE` trigger that rejects any change to `has_premium_download_access` when the request role is not service-role. Column-level privileges (option a) are the simpler default; the trigger is a fallback if column-level GRANT/REVOKE proves awkward to combine with the existing RLS policy in practice.

## Risks / Trade-offs

- [Risk] A future migration accidentally adds a permissive UPDATE policy to `user_credits` → Mitigation: this is called out explicitly in the spec as the single most important boundary in the system; code review / schema review for this table should treat any new policy on it as a high-severity change.
- [Risk] Signed URLs for LinkedIn PDFs could be leaked (e.g. logged, shared) and grant read access until expiry → Mitigation: keep expiry short-lived (minutes, not hours) — the concrete TTL is an implementation detail for whoever wires up signed URL generation server-side, not a spec-level constraint.
- [Risk] Storage path-scoping depends on every uploader correctly prefixing paths with `user_id` → Mitigation: the INSERT policy itself checks the path against `auth.uid()`, so a client cannot upload to a mismatched path even if the calling code has a bug.
- [Risk] Column-level `REVOKE` on `has_premium_download_access` could be bypassed if a future migration replaces the table's grants wholesale (e.g. a careless `GRANT ALL`) → Mitigation: treat this column's write boundary with the same review scrutiny called out above for `user_credits` — any change to `profiles` grants is a high-severity review item.

## Migration Plan

This is the initial data layer for a new project — no existing data or schema to migrate from. Deploy as a set of Supabase migrations (Auth provider config, table DDL, RLS policies, Storage bucket + policies, Realtime publication) applied in order: Auth providers → tables (including `credit_ledger`, `analytics_events`, and the `has_premium_download_access` column on `profiles`) → RLS policies + column-level grants → Storage bucket/policies → Realtime. Rollback is dropping the migration set, safe pre-launch since no production data exists yet.
