## 1. Auth Providers

- [x] 1.1 Enable Email/Password provider in Supabase Auth settings
- [x] 1.2 Configure Google OAuth provider (client ID/secret, redirect URLs) in Supabase Auth settings
- [ ] 1.3 Verify both providers produce/reuse the same `user_id` for a given account (deferred: needs real signup UI, no login/signup flow exists in the app yet — revisit once the Frontend layer builds it)

## 2. Core Tables

- [x] 2.1 Create `profiles` table (`user_id`, `email`, `display_name`, `plan_tier`, `created_at`, `has_premium_download_access` boolean default `false`)
- [x] 2.2 Create `user_credits` table (`user_id`, free message count remaining, payment success status)
- [x] 2.3 Create `resumes` table (`user_id`, raw text input, Claude structured output)
- [x] 2.4 Create `credit_ledger` table (`user_id`, amount/delta, reason/type, related request reference, timestamp)
- [x] 2.5 Create `analytics_events` table (`user_id`, related request reference, usage details, timestamp)
- [x] 2.6 Add a trigger or onboarding step that initializes `profiles` and `user_credits` rows on new user signup

## 3. Row Level Security

- [x] 3.1 Enable RLS on `profiles`, `user_credits`, `resumes`, `credit_ledger`, `analytics_events`
- [x] 3.2 Add owner read/write policy (`auth.uid() = user_id`) on `profiles`
- [x] 3.3 Add owner read-only SELECT policy (`auth.uid() = user_id`) on `user_credits`; add no INSERT/UPDATE/DELETE policy for the client role
- [x] 3.4 Add owner read/write policy (`auth.uid() = user_id`) on `resumes`
- [x] 3.5 Verify service-role key bypasses RLS and can write `user_credits` (manual/integration check)
- [x] 3.6 Add owner read-only SELECT policy (`auth.uid() = user_id`) on `credit_ledger`; add no INSERT/UPDATE/DELETE policy for the client role
- [x] 3.7 Add owner read-only SELECT policy (`auth.uid() = user_id`) on `analytics_events`; add no INSERT/UPDATE/DELETE policy for the client role
- [x] 3.8 Revoke client-role UPDATE privilege on `profiles.has_premium_download_access` specifically (column-level `REVOKE`, alongside the row-level owner-write policy that still allows other columns) — or, if that proves awkward with the existing RLS policy, add a `BEFORE UPDATE` trigger rejecting non-service-role changes to that column
- [x] 3.9 Verify service-role key bypasses RLS and can write `credit_ledger`, `analytics_events`, and `profiles.has_premium_download_access` (manual/integration check)
- [x] 3.10 Verify an owner update to `profiles` that also touches `has_premium_download_access` fails entirely (permission denied), leaving all columns including the legitimate ones unchanged; a standalone update to only the legitimate columns still succeeds

## 4. Storage

- [x] 4.1 Create private Storage bucket for LinkedIn PDFs (public access disabled)
- [x] 4.2 Add owner-scoped, path-scoped INSERT policy (`{user_id}/...`) on the bucket
- [x] 4.3 Confirm no SELECT policy grants public or cross-user read access
- [x] 4.4 Document/verify server-side signed URL generation pattern for read access

## 5. Realtime

- [x] 5.1 Enable Realtime (`postgres_changes`) publication on `user_credits`
- [x] 5.2 Verify RLS scopes delivered change events to the row owner only

## 6. Validation

- [x] 6.1 Write/run integration checks confirming a user cannot read or write another user's `profiles`, `user_credits`, `resumes`, `credit_ledger`, or `analytics_events` rows
- [x] 6.2 Write/run integration checks confirming no client role can mutate `user_credits`, `credit_ledger`, or `analytics_events`
- [x] 6.3 Write/run integration checks confirming Storage upload/read boundaries (own path only, signed-URL-only read)
- [x] 6.4 Write/run an integration check confirming a client-originated write to `profiles.has_premium_download_access` never takes effect, even when bundled with a legitimate write to another `profiles` column
