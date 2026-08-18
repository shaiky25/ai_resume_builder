## Why

Architect review of the open change set surfaced one launch-blocking gap that no open proposal covers: PDF/DOCX export currently compiles entirely client-side (`downloadResumePdf`/`downloadResumeDocx` in `ai_resume_builder/src/lib/export/`) with zero network request, so the `has_premium_download_access` gate added by `close-integration-gaps`/`payment-gatekeeping` is UI-only and trivially bypassed via devtools — the payment layer has no actual enforcement point. Separately, the chat pipeline currently only detects likely prompt-injection/off-topic-repurposing after the fact (`harden-chat-prompt-injection`'s post-response signal check) — there is no cheap, pre-flight check that catches an obviously off-topic or scope-violating message before it costs a Claude call and a credit. Both are addressed here since neither has an owning open change.

## What Changes

- Move PDF/DOCX compilation server-side behind a new authenticated export endpoint that checks the requesting user's `has_premium_download_access` from server-side truth (not client-supplied state) before compiling and returning the file, closing the devtools-bypass gap called out as a known trade-off in `close-integration-gaps`'s design.md.
- Add a deterministic, pattern/keyword-based intent pre-filter that runs on the user's inbound message before it is sent to Claude: messages that unambiguously request something outside resume/career-coaching scope (e.g. explicit "ignore your instructions" / role-override phrasing, requests with no plausible resume-writing framing) are short-circuited with a clear in-scope redirect — no Claude call, no credit spent. Ambiguous or borderline messages pass through unaffected, since a false-positive block on a legitimate resume conversation is worse than an occasional miss the existing post-response check (`harden-chat-prompt-injection`) still catches.
- **BREAKING**: none — `ExportControls`' UI-visible behavior (buttons, disabled state) is unchanged; the compiled-file source moves server-side but the user-facing flow (click, get a file) is the same. `POST /api/chat`'s success-path contract is unchanged; the pre-filter only adds a new short-circuit response for a message that would otherwise have been sent to Claude.

## Capabilities

### New Capabilities
- `export-authorization`: server-side authorization and compilation for PDF/DOCX export, checking `has_premium_download_access` from server-side truth before producing the file — the actual enforcement point the client-side gate currently lacks.
- `chat-intent-prefilter`: deterministic pre-flight scan of the inbound chat message for unambiguous off-topic/scope-override intent, short-circuiting before any Claude call or credit spend, without blocking ambiguous or legitimate resume-related messages.

### Modified Capabilities
(none — `premium-download-gate` and `chat-system-prompt-injection` are unchanged in contract; this change adds a new enforcement layer alongside them rather than altering their existing requirements)

## Impact

- **Affected code**: `ai_resume_builder/src/lib/export/downloadPdf.tsx`, `downloadDocx.ts` (compilation moves to a new server route; client keeps only the trigger/download-blob step), `ExportControls.tsx` (calls the new endpoint instead of compiling locally), a new `POST /api/export/{pdf,docx}` route pair, and `handleChatRequest.ts` (new pre-filter check inserted before the Claude stream is opened, alongside the existing input-length checks from `harden-chat-prompt-injection`).
- **Dependencies/assumptions**: assumes `has_premium_download_access` (from `payment-gatekeeping`) and `resumes.structured_output` (already used by the client-side preview) are both readable server-side for the authenticated user; assumes `harden-chat-prompt-injection`'s input-bounds and post-response abuse-signal-logging land as the complementary post-flight layer — this change's pre-filter is deliberately conservative (only unambiguous cases) precisely because that safety net already exists.
- **Out of scope**: any change to pricing/export file formats, a general content-moderation/ML classifier (pattern-matching only, consistent with `harden-chat-prompt-injection`'s Decision on deterministic checks), and preventing a user from manually reconstructing their resume from the (unpaywalled) live preview text — that is an accepted business trade-off, not something export-side enforcement can close.
- **No breaking changes**: additive server-side enforcement and an additive pre-flight short-circuit path; no existing success-path contract changes shape.
