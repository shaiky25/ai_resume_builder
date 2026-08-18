## Why

Users currently have no way to get an existing resume into the app except by retyping or pasting its text into chat, which is tedious and error-prone for anyone who already has a written resume as a PDF. The data layer already has a private Storage bucket for uploaded PDFs and a `resumes.raw_text` column that the chat prompt already injects as trusted background context (`chat-system-prompt-injection`) — but nothing today lets a user actually upload a file or turns a PDF into that stored text.

## What Changes

- Add an upload affordance (near the existing chat input) letting a user pick a PDF resume file instead of pasting text.
- Reject files above a size limit (5 MB, assumption — flag for confirmation) before upload starts, client-side.
- Store the uploaded PDF in the existing `linkedin-pdfs` Storage bucket at a path scoped to the user (owner-scoped INSERT policy already supports this; no bucket policy change needed).
- Re-validate the size limit server-side on the uploaded object (defense in depth against a bypassed client-side check).
- Extract text from the PDF server-side using a deterministic PDF-parsing library — never by sending the PDF itself (as bytes/base64) to the LLM to "read." This keeps token cost bounded and predictable regardless of PDF page count or encoding.
- Cap the length of extracted text before it's persisted; if extraction yields no usable text (e.g. a scanned/image-only PDF with no text layer) or exceeds the cap, surface a clear error asking the user to paste the content manually instead of persisting nothing or truncating silently.
- Persist successfully extracted text to the user's `resumes.raw_text` column, replacing any previous value (same replace-on-update pattern as target job / structured output) — no other column changes needed, so downstream prompt injection and structured extraction pick it up unchanged.

## Capabilities

### New Capabilities
- `resume-pdf-upload`: upload UI, client- and server-side file size limits, server-side (non-LLM) PDF text extraction, extracted-text length cap, and persistence of the extracted text to the user's resume record.

### Modified Capabilities
(none — `linkedin-pdf-storage`'s existing bucket/RLS and `resumes-schema`'s existing `raw_text` column already cover what this change needs; no requirement-level behavior changes to either.)

## Impact

- **Affected systems**: new API route (server-side PDF parsing), new frontend upload control, `linkedin-pdfs` Storage bucket (new consumer, no policy change), `resumes.raw_text` (new writer).
- **New dependency**: a server-side PDF text-extraction library (chosen in design.md).
- **Consumers unaffected**: `chat-system-prompt-injection`'s prompt composition and `resume-structured-extraction`'s post-turn hook already read/derive from `raw_text` / conversation as today — this change only adds a new way to populate `raw_text`.
- **Out of scope**: OCR for scanned/image-only PDFs, multi-file or resume-version history, automatically triggering structured extraction immediately on upload (it happens on the next chat turn as today).
