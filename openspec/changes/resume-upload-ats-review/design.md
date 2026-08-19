## Context

See proposal.md - Why. Relevant existing pieces this design builds on:
- `handleChatRequest.ts` (`resume-structured-extraction`): after a chat turn's response is fully streamed to the client, it calls `deps.resumeExtractionClient.extractResume(previousStructuredOutput, latestTurn)` where `previousStructuredOutput` comes from `resumeContextGateway.getLatestResumeContext(userId)` and `latestTurn` is `[{ role: "user", content: body.message }, { role: "assistant", content: assistantText }]`. On success it calls `resumeContextGateway.persistStructuredOutput(userId, structuredOutput)`. The whole block is wrapped so a failure only logs — it never affects the already-sent chat response.
- `handlePdfUploadRequest.ts` (`resume-pdf-upload`): downloads the user's uploaded PDF, extracts text, and on success calls `resumeContextGateway.persistRawText(userId, trimmed)`, returning `200 { success: true }`. It has no `ChatTurnInput`-shaped conversation and does not currently touch `structured_output`.
- `useResumeDraft.ts`: subscribes to the user's `resumes` row via Supabase Realtime plus an initial fetch — already reflects any `structured_output` write regardless of which server code path produced it. No client change needed.

## Goals / Non-Goals

**Goals:**
- Make `handlePdfUploadRequest` trigger the same extract-then-persist step `handleChatRequest` already runs, reusing the existing `ResumeExtractionModelClient` and `ResumeContextGateway` dependencies — no new pipeline.
- Preserve the non-blocking-failure guarantee: a structured-extraction failure after upload must not turn a successful raw-text persist into an error response.

**Non-Goals:**
- No change to the chat-turn-triggered extraction path — it is reused, not modified.
- No new API route or client-side call — everything happens inside the existing `/api/resume/pdf` handler.
- No OCR, format/parseability (ATS) review, or any content-quality check — out of scope per proposal.md.

## Decisions

- **Reuse `extractResume`'s existing signature as-is**: call `deps.resumeExtractionClient.extractResume(previousStructuredOutput, latestTurn)` with `previousStructuredOutput` fetched via `resumeContextGateway.getLatestResumeContext(userId)` (same call `handleChatRequest` makes) and `latestTurn` synthesized as a single-entry array: `[{ role: "user", content: trimmed }]` (the just-extracted raw text), with no assistant entry since there is no chat response for this event. Rationale: the extraction tool's framing already describes its input as "the latest turn of the conversation... provided so you can extract resume-relevant facts from it" — a resume's full text is exactly that kind of material, and reusing the identical client/schema means zero new prompt or tool-schema work. Alternative considered: adding a new `extractFromDocument`-style method to `ResumeExtractionModelClient` — rejected, since the existing method's input shape (prior record + new text to merge in) already fits without a new interface.
- **Fetch prior context before persisting raw text, in the same request**: add one `resumeContextGateway.getLatestResumeContext(user.id)` call in `handlePdfUploadRequest`, mirroring `handleChatRequest`'s existing pattern, so the upload-triggered extraction call merges with whatever structured data already exists (chat-turn-derived or from a prior upload) instead of starting from nothing.
- **Ordering: raw text is persisted before extraction is attempted, and the extraction step is wrapped in its own try/catch that only logs**: mirrors `handleChatRequest`'s ordering (chat response is finalized before extraction runs) — the upload response (`200 { success: true }`) is what's already guaranteed by `raw_text` persistence succeeding; a subsequent extraction failure is caught, logged, and never turns that response into an error. Alternative considered: running extraction before persisting raw text so a failure could roll back nothing — rejected, since raw text is the primary artifact the upload promises, and per the existing `resume-pdf-upload` spec its persistence must not be entangled with a separate, independently-failing derivation step.
- **No `degradedExtractionSignalDetector` call on this path**: that detector's signal (`body.message`) is chat-message-shaped and has no analogue for an upload event; omitting it here is a straightforward scope cut, not a design trade-off worth revisiting later.

## Risks / Trade-offs

- [The extraction call adds LLM latency to the `/api/resume/pdf` response the client is already awaiting, extending "Reading your resume…" state] → acceptable: the request already does one LLM-free but I/O-bound step (PDF parsing); one additional extraction call is the same cost `handleChatRequest` already pays after every turn, and the failure path still returns success from the perspective of raw-text persistence.
- [A resume's full raw text is longer and differently-shaped than a single chat turn, which the extraction tool wasn't validated against] → the tool's `EXTRACTION_CONTENT_FRAMING`/prior-record merge behavior is generic ("extract resume-relevant facts from" arbitrary conversational content); no schema change is needed, and this can be tuned later without a spec change if extraction quality on full-resume text proves weaker in practice.

## Migration Plan

- Additive only: one new step inside `handlePdfUploadRequest` (fetch prior context, call existing extraction client, persist on success, catch-and-log on failure). No schema, route, or client changes.
- Rollback: remove the new step; `handlePdfUploadRequest` reverts to persisting only `raw_text`, exactly as it behaves today.
