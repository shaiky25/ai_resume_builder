## 1. Resume Structured Extraction (backend)

- [x] 1.1 Define a fixed resume-fields tool schema (name, title, summary, experience, etc.) for Claude's structured-output/tool-use call
- [x] 1.2 Add a post-stream extraction step in `handleChatRequest.ts` that calls the model client with the tool schema against the completed conversation, after `event: done` is queued
- [x] 1.3 Persist successful extraction output to the user's `resumes.structured_output` (upsert, scoped to `user_id`, service-role write)
- [x] 1.4 On extraction failure, log the error and skip persistence without affecting the already-delivered chat response
- [x] 1.5 Integration test: successful turn persists `structured_output` for the correct user
- [x] 1.6 Integration test: extraction failure does not alter the chat response the client already received and does not write partial/corrupt `structured_output`
- [x] 1.7 Integration test: extraction output for one user is never written to another user's `resumes` row

## 2. Chat Live Integration (frontend)

- [x] 2.1 Replace `ChatExperience.tsx`'s mocked `sendMessage` with a real client that POSTs to `/api/chat` with the auth token, message, and turn history
- [x] 2.2 Consume the SSE response (`event: message` deltas, `event: done`, `event: error`) and render assistant text incrementally
- [x] 2.3 Add visible UI states for `out_of_credits` (403) and rate-limited (429) responses
- [x] 2.4 Add a visible error state for a stream that emits `event: error` mid-response, without presenting partial text as a complete reply
- [x] 2.5 Remove `MOCK_ASSISTANT_REPLY`, `MOCK_RESUME_DRAFT`, and the turn-count timer now that they're unused

## 3. Live Resume Preview (frontend)

- [x] 3.1 Add a Supabase Realtime subscription on the authenticated user's `resumes` row (reusing the `postgres_changes` pattern from `/payment/processing/page.tsx`), plus an initial fetch on mount
- [x] 3.2 Derive `resumeDraft` from the subscribed `structured_output`
- [x] 3.3 Derive `isResumeReady` from whether `structured_output` has reached a usable shape (e.g. name + at least one experience entry), replacing the turn-count mock
- [x] 3.4 Verify the manual-reveal override in `PreviewPane` still works unchanged against the new data source

## 4. Premium Download Gate (frontend)

- [x] 4.1 Add a Supabase Realtime subscription on the authenticated user's `profiles` row for `has_premium_download_access`, plus an initial fetch on mount
- [x] 4.2 Update `ExportControls`'/`PreviewPane`'s disabled logic to require both `isResumeReady` AND `has_premium_download_access`
- [x] 4.3 Verify export re-enables live when `has_premium_download_access` flips true without a page reload

## 5. Checkout Entry Point (frontend)

- [x] 5.1 Add a checkout-trigger UI element, shown only when `has_premium_download_access` is false
- [x] 5.2 Wire the trigger to call the existing `POST /api/payments/checkout` endpoint and navigate to the returned checkout destination
- [x] 5.3 Hide the trigger once `has_premium_download_access` becomes true (same subscription as task 4.1)

## 6. Validation

- [ ] 6.1 End-to-end manual pass: sign in, converse until preview unblurs with real (non-mock) content, start checkout, complete payment, confirm export unlocks — no step relies on mocked data
- [x] 6.2 Confirm no regressions in existing `handleChatRequest`, `ExportControls`, and `PreviewPane` test suites after wiring changes
