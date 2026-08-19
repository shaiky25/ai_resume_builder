## 1. Wire prior context and extraction dependencies into the upload handler

- [ ] 1.1 Add `resumeExtractionClient: ResumeExtractionModelClient` to `PdfUploadRequestDependencies` (and `createDefaultDependencies`), reusing `AnthropicResumeExtractionModelClient` — the same implementation `handleChatRequest.ts` already wires in.
- [ ] 1.2 In `handlePdfUploadRequest`, after `persistRawText` succeeds, call `deps.resumeContextGateway.getLatestResumeContext(user.id)` to fetch any previously persisted structured output (needed as `extractResume`'s first argument).

## 2. Trigger extraction after a successful upload

- [ ] 2.1 Call `deps.resumeExtractionClient.extractResume(previousStructuredOutput, [{ role: "user", content: trimmed }])` immediately after raw text is persisted, per design.md's chosen input shape.
- [ ] 2.2 On a non-null result, call `deps.resumeContextGateway.persistStructuredOutput(user.id, structuredOutput)`.
- [ ] 2.3 Wrap the extraction call and persistence in their own try/catch that only logs (`console.error`) — a failure here must not change the route's success response or touch the already-persisted `raw_text` (spec: "Upload-triggered extraction failure does not fail the upload").
- [ ] 2.4 Confirm the route still returns `200 { success: true }` whether or not the extraction step succeeds, as long as raw-text persistence itself succeeded.

## 3. Tests

- [ ] 3.1 Add a fake `ResumeExtractionModelClient` to `handlePdfUploadRequest.test.ts` (mirroring the pattern already used in `handleChatRequest.test.ts`) and extend the fake `ResumeContextGateway` to record `persistStructuredOutput` calls.
- [ ] 3.2 Test: a successful upload with no prior structured output calls `extractResume(null, [{ role: "user", content: <extracted text> }])` and persists the result to `structured_output`.
- [ ] 3.3 Test: a successful upload with existing prior structured output passes it as `extractResume`'s first argument (merge-with-prior behavior).
- [ ] 3.4 Test: when `extractResume` throws, the route still returns `200 { success: true }`, `persistRawText`'s result is unaffected, and `persistStructuredOutput` is never called.
- [ ] 3.5 Test: when `persistStructuredOutput` throws, the route still returns `200 { success: true }`.
- [ ] 3.6 Test: extraction is never attempted when raw-text persistence itself fails, size validation fails, or no extractable text is found (existing early-return paths stay untouched).

## 4. Verification

- [ ] 4.1 Manually upload a resume PDF in the running app with no prior chat activity and confirm the preview pane (`useResumeDraft`) populates without sending a chat message first.
- [ ] 4.2 Confirm a second upload after a prior chat-turn-derived structured output merges rather than discards previously extracted fields (e.g. upload text without an email doesn't wipe a name already captured via chat).
