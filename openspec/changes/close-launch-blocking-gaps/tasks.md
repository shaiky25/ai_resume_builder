## 1. Server-side export compilation

- [ ] 1.1 Add `POST /api/export/pdf` and `POST /api/export/docx` routes, authenticated via the existing `verifyRequestUser` pattern
- [ ] 1.2 Read `has_premium_download_access` from `profiles` via the service-role client (never from request body/headers); refuse with a distinguishable error if false or unauthenticated
- [ ] 1.3 Move PDF compilation logic (`pdfDocument.tsx` rendering) into the server route, fetching `resumes.structured_output` server-side rather than accepting it from the client
- [ ] 1.4 Move DOCX compilation logic into the server route the same way
- [ ] 1.5 Update `ExportControls.tsx` to call the new endpoints and pass the response blob to the existing `triggerBlobDownload` helper, instead of compiling locally
- [ ] 1.6 Remove the now-unused client-side compilation code paths in `downloadPdf.tsx`/`downloadDocx.ts` once the endpoint switch is verified working
- [ ] 1.7 Integration test: authorized user's export request returns a compiled file (matches `export-authorization` spec scenario)
- [ ] 1.8 Integration test: unauthorized user's export request is refused with no file returned
- [ ] 1.9 Integration test: unauthenticated export request is refused
- [ ] 1.10 Integration test: a client-supplied `has_premium_download_access: true` claim in the request body/headers is ignored when the server-side value is false

## 2. Chat intent pre-filter

- [ ] 2.1 Define the initial deterministic pattern list (instruction-override phrasing, role-override phrasing) as a small, reviewable constant, positioned near `masterPrompt.ts`/`handleChatRequest.ts`
- [ ] 2.2 Add the pre-filter check in `handleChatRequest.ts` immediately after the existing message/history validation (after `harden-chat-prompt-injection`'s input-bounds checks) and before the credit-gate read
- [ ] 2.3 On a match, return the redirect response without reserving a credit or calling the model
- [ ] 2.4 Integration test: a message matching an instruction-override pattern is short-circuited with no credit reserved and no Claude call made (matches `chat-intent-prefilter` spec scenario)
- [ ] 2.5 Integration test: a normal resume-related message proceeds through the pipeline unaffected
- [ ] 2.6 Integration test: an ambiguous/unclear-topic message that matches no pattern is not blocked
- [ ] 2.7 Integration test: rate-limit counting is unaffected by whether a request is later short-circuited by the pre-filter

## 3. Verification

- [ ] 3.1 Regression pass: existing export component tests and `handleChatRequest.test.ts` still pass
- [ ] 3.2 Manual pass: attempt export via devtools with `has_premium_download_access` forced true in client state only (server-side value false) — confirm no file is returned
- [ ] 3.3 Manual pass: send a handful of realistic resume-coaching messages through the pre-filter to confirm none are falsely short-circuited
