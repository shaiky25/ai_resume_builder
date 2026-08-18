## 1. Dependencies and constants

- [x] 1.1 Add the `unpdf` PDF text-extraction library as a dependency
- [x] 1.2 Define shared constants for the upload size limit (5 MB) and extracted-text length cap (50,000 characters), used by both client and server checks

## 2. Upload API route

- [x] 2.1 Add a Node-runtime API route that accepts an authenticated request referencing a PDF already uploaded to the user's `linkedin-pdfs` storage path
- [x] 2.2 Re-validate the stored object's size against the size limit before parsing; return an error without parsing if it exceeds the limit
- [x] 2.3 Extract text from the PDF using `unpdf`, never sending the PDF's binary/base64 content to the LLM
- [x] 2.4 Catch and surface parser exceptions as a generic extraction-failed error rather than letting them crash the route
- [x] 2.5 Return a no-extractable-text error (no persistence) when extraction yields empty/whitespace-only text
- [x] 2.6 Return an extraction-failed error (no persistence) when extracted text exceeds the length cap, rather than truncating it
- [x] 2.7 On successful extraction within the cap, persist the text as the authenticated user's resume raw text via a new `persistRawText` method on `ResumeContextGateway`, replacing any previous value, scoped to that user

## 3. Upload UI

- [x] 3.1 Add an upload control near the existing chat input, alongside the other input affordances, letting the user pick a PDF file
- [x] 3.2 Validate the selected file's size against the size limit client-side before starting the upload; show a clear error and do not start the upload if it's too large
- [x] 3.3 Upload the selected PDF directly to the `linkedin-pdfs` bucket at the user's scoped path (`${userId}/resume.pdf`), overwriting any previous object
- [x] 3.4 After a successful storage upload, call the new API route to trigger extraction and persistence
- [x] 3.5 Show upload/extraction progress and success feedback to the user
- [x] 3.6 Show the server's error message (size limit, no-extractable-text, or extraction-failed) if the API route returns an error, without misleading the user into thinking their resume was updated

## 4. Verification

- [x] 4.1 Verify RLS/storage policy: a user cannot upload to or trigger extraction against another user's storage path
- [x] 4.2 Verify a PDF over the size limit is rejected both client-side (before upload) and server-side (if the client check is bypassed)
- [x] 4.3 Verify no request containing the PDF's binary/base64 content is ever sent to the LLM during the upload flow
- [ ] 4.4 Manually test a normal text-based resume PDF: upload succeeds, extracted text appears in `resumes.raw_text`, and the next chat turn reflects it as context
- [ ] 4.5 Manually test a scanned/image-only PDF with no text layer: upload is rejected with a clear "paste manually" error, and no raw text is persisted
- [ ] 4.6 Manually test that a second successful upload replaces the previously stored raw text, scoped to the same user
