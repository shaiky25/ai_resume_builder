## Why

`resume-pdf-upload` persists `raw_text` on a successful upload, but structured resume data (`resumes.structured_output`, which drives the live preview pane) is only derived after a chat turn completes (`resume-structured-extraction`) — the upload path never triggers it. A user who uploads a resume and hasn't yet sent a chat message sees a success banner claiming "your coach now has the full text," but the preview pane stays empty/blurred and no structured data exists until they manually send a message. This is a missing trigger in `handlePdfUploadRequest`, not a display bug: the upload flow has no code path that invokes extraction at all.

## What Changes

- Extend `resume-structured-extraction`'s trigger condition: a successful PDF upload (raw text persisted) SHALL also derive and persist structured resume data immediately, in addition to the existing after-each-chat-turn trigger — the same derive-and-persist pipeline already used for chat-turn-triggered extraction (fixed-schema extraction call merging the newly extracted raw text with any previously persisted `structured_output`), not a separate or duplicate pipeline.
- This runs server-side within the same `/api/resume/pdf` request that already persists `raw_text` — no new client API call or route.
- The frontend's existing Supabase Realtime subscription (`useResumeDraft`) already reflects any `resumes.structured_output` update regardless of what triggered it, so the preview pane updates automatically with no client-side change required.
- Extraction failure after a successful upload SHALL NOT fail the upload request or discard the already-persisted `raw_text` — mirrors the existing "extraction failure does not fail the chat turn" guarantee (`resume-structured-extraction`), extended to this new trigger.
- No change to the existing after-chat-turn trigger; both triggers coexist. No change to the extraction tool schema or prompt itself.

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `resume-structured-extraction`: gains a new trigger condition — successful PDF upload / raw-text persistence — alongside the existing after-chat-turn trigger, with the same non-blocking-failure guarantee extended to this new trigger.

## Impact

- **Affected code**: `handlePdfUploadRequest.ts` gains a step after persisting `raw_text` that invokes the same extraction client and `persistStructuredOutput` gateway method `handleChatRequest.ts` already uses — reusing existing dependencies rather than introducing a new pipeline. Exact shape of the "latest turn" input passed to the extraction call (since there's no real chat turn here) is a design.md decision.
- **No new API route or client-side call**: the existing `/api/resume/pdf` request just does more server-side work.
- **No required frontend change**: `useResumeDraft`'s Realtime subscription already reflects `structured_output` updates from any source.
- **UI copy**: the existing success banner's wording becomes accurate once this fix lands (optional tightening, not required).
- **Consumers unaffected**: chat-turn-triggered extraction, `resume-optimization-strategy`, `chat-system-prompt-injection`.
- **Out of scope**: the previously-discussed ATS format/parseability review (multi-column layout, tables, embedded images, section-header detection) is a separate idea, not part of this fix, and can be proposed separately if still wanted.
