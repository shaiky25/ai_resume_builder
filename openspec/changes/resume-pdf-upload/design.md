## Context

See proposal.md - Why. Relevant existing pieces this change builds on:
- `linkedin-pdf-storage`: private Storage bucket (`linkedin-pdfs`), owner-scoped path-based INSERT policy, signed-URL-only read — already supports a client uploading its own PDF, unused today.
- `resumes-schema`: `resumes.raw_text` column, owner-scoped RLS — already read by `chat-system-prompt-injection`'s prompt composition (`promptComposer.ts`) as trusted background context.
- `/api/chat` route (`src/app/api/chat/route.ts`) runs on the Node.js runtime (`export const runtime = "nodejs"`), the established pattern for server routes that need full Node APIs — the new parsing route follows the same convention.

## Goals / Non-Goals

**Goals:**
- Turn an uploaded PDF into plain text without ever sending PDF bytes to the LLM.
- Bound token/cost exposure with a hard, deterministic cap independent of what the model does.
- Reuse existing storage/RLS/schema infrastructure rather than adding new tables or buckets.

**Non-Goals:**
- OCR for image-only/scanned PDFs — out of scope per proposal; such files hit the "no extractable text" error path.
- Resume version history / multiple stored resumes — each upload replaces the prior `raw_text`, same as today's other resume fields.
- Immediately re-running structured extraction on upload — it continues to run on the next chat turn, unchanged.

## Decisions

- **Upload path**: client uploads the PDF directly to the `linkedin-pdfs` bucket via the Supabase client SDK, to `${userId}/resume.pdf` (fixed filename — a new upload overwrites the previous object, mirroring "replacing any previous value" elsewhere in this data model). Rationale: the bucket's existing owner-scoped INSERT policy already permits this with no server round-trip for the file bytes themselves; the server only needs to read it back for parsing.
- **Parsing library**: `unpdf` (a maintained, serverless/Node-friendly wrapper around pdf.js's text-extraction) for server-side text extraction, invoked from a new Node-runtime API route (`/api/resume/pdf` or similar) after the client confirms the upload succeeded. Rationale: deterministic, does not invoke the LLM, works in the same Node runtime already used by `/api/chat`. Alternative considered: `pdf-parse` — more widely known, but its default entry point has a well-documented footgun (attempts to read a bundled test fixture when required incorrectly) and is less actively maintained; rejected in favor of `unpdf`.
- **Size limits enforced at two points**: (1) client-side check against the file's `size` before starting the upload, for immediate feedback (5 MB assumption from proposal.md, to be confirmed), and (2) server-side re-check of the stored object's size before parsing, since a client-side check alone can be bypassed by calling the API directly. Both use the same limit constant. Rationale: client-side check is UX-only and never trusted as the sole guard; server-side re-check is the actual enforcement boundary, consistent with the rest of this app's trust boundary (client-supplied data is never trusted for anything security- or cost-relevant).
- **Extracted-text length cap**: after extraction, the resulting plain text is capped at a fixed character count (e.g. 50,000 characters — comfortably larger than any real resume, small enough to bound prompt-injection cost) before persistence. Text over the cap is treated as extraction failure (surfaced as an error), not silently truncated, since a resume-shaped PDF should never legitimately produce that much text and silent truncation could cut off content the user doesn't know is missing. Rationale: this is the actual token/cost guardrail the proposal calls for — the file-size limit alone doesn't bound extracted text length (e.g. a large embedded font subset vs. dense repeated text).
- **No-text-found handling**: if extraction yields empty or whitespace-only text (typical of a scanned/image-only PDF with no text layer), the API returns an error rather than persisting an empty `raw_text`, so the UI can tell the user to paste their resume text manually instead of silently doing nothing.
- **Persistence**: extracted text is written to `resumes.raw_text` via the existing `ResumeContextGateway` upsert pattern (`resumeContext.ts`), adding one new `persistRawText` method alongside the existing `persistStructuredOutput`/`persistBaselineAssessment`/etc. methods — same replace-existing-row-or-insert behavior, same `userId` scoping.

## Risks / Trade-offs

- [A malformed or adversarial PDF could be expensive/slow to parse, or trigger a parser bug] → the parse step runs server-side only (never client-side, never handed to the LLM), inherits the file-size cap as a first bound on work done, and any parser exception is caught and surfaced as a generic extraction-failed error, not allowed to crash the route.
- [5 MB size limit and 50,000-character text cap are estimates, not measured against real resume PDFs] → both are simple constants in one place, easy to tune after real usage without any structural change.
- [Fixed `resume.pdf` object path means the raw uploaded file itself has no history, only the extracted text does] → acceptable per proposal's out-of-scope note on version history; the bucket already exists for "future reference," and this change doesn't change that bucket's retention behavior.

## Migration Plan

- Additive only: new API route, new upload UI control, one new gateway method. No schema or bucket policy changes.
- Rollback: remove the upload UI affordance and the new route; existing `raw_text` values (however populated) and all other behavior are unaffected.
