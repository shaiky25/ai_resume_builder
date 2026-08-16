## Context

See proposal.md - Why. Two independent gaps, bundled here because neither is owned by an open change and both are cheap, additive server-side checks.

`downloadResumePdf`/`downloadResumeDocx` (`ai_resume_builder/src/lib/export/`) confirmed to compile entirely in-browser via `@react-pdf/renderer`/the DOCX equivalent — "No network request is made" per the existing code comment. `ExportControls.tsx` calls these directly; `has_premium_download_access` only gates the `disabled` prop via `usePremiumDownloadAccess`, which is client React state and trivially overridable via devtools.

`handleChatRequest.ts`'s pipeline (post `harden-chat-prompt-injection`) is: auth → rate limit → parse/validate body (message + history, now including length bounds) → credit-gate read → atomic reserve → resume-context fetch → prompt composition → Claude stream. `harden-chat-prompt-injection` adds a post-response abuse-signal check after the stream completes; nothing today inspects the message before it's sent.

## Goals / Non-Goals

**Goals:**
- Make `has_premium_download_access` enforcement actually unbypassable by a client controlling only the browser — the compiled file must not be obtainable without the server-side check passing.
- Catch the clearest, cheapest-to-detect off-topic/repurposing attempts before they cost a Claude call, without introducing false positives that block real resume conversations.

**Non-Goals:**
- Preventing a user from manually recreating their resume from the (unpaywalled) live preview text — the preview itself is not behind the payment gate in this product's design, so a sufficiently motivated user retyping/copying visible text is an accepted business trade-off, not a security bug this change can close.
- A full content-moderation/ML classifier for the intent pre-filter — deterministic pattern matching only, consistent with `harden-chat-prompt-injection`'s existing decision to avoid a second judge-LLM call.
- Changing export file formats, layout, or the credit/rate-limit pipeline order for normal (non-short-circuited) messages.

## Decisions

### 1. Export compilation moves server-side; the compiled file is the enforcement boundary
Add `POST /api/export/pdf` and `POST /api/export/docx`, authenticated the same way `POST /api/chat` is (`verifyRequestUser`). Each handler: (a) verifies the user, (b) reads `has_premium_download_access` from `profiles` via the service-role client (server-side truth, never client-supplied), (c) on true, fetches the user's `resumes.structured_output` server-side and compiles it using the same `@react-pdf/renderer`/DOCX-building logic currently in `downloadPdf.tsx`/`downloadDocx.ts` (moved server-side, not duplicated), returning the file as the response body. `ExportControls.tsx` calls the endpoint and hands the response blob to the existing `triggerBlobDownload` helper — the download-trigger UX is unchanged, only the compilation step moves.

Alternative considered: keep client-side compilation but require a server-issued short-lived signed token before `downloadResumePdf` is allowed to run. Rejected — a purely client-side gate (even one requiring a fetched token) can always be bypassed by a browser user calling the underlying render function directly in devtools, since the check and the compiled output would both still live in client JS. Only moving compilation itself server-side removes that path.

### 2. Intent pre-filter is a small, explicit deterministic pattern list — not a classifier
Maintain a short, explicit list of high-confidence phrase/pattern matches (instruction-override phrasing like "ignore (all|your) (previous |prior )?instructions", "you are now", "act as", "pretend you('re| are)", "system prompt", combined with an absence of any resume/career-coaching keyword in the same message) checked against the inbound `message` in `handleChatRequest.ts`, positioned right after the existing message/history validation (`harden-chat-prompt-injection`'s input-bounds checks) and before the credit-gate read. A match short-circuits with `200 { redirect: "out_of_scope" }` (or similar, following the existing `jsonResponse` helper's shape) — deliberately not a 4xx, since this isn't a client error, it's a scope decision the product is making.

Alternative considered: reuse the abuse-signal patterns from `harden-chat-prompt-injection` (which scan the model's *output*) by running them on the *input* instead. Rejected as the sole mechanism — output-side leak detection (did the model actually say something wrong) and input-side intent detection (does this message look like an attempt) are different signals with different false-positive profiles; the input-side list here is deliberately narrower/higher-confidence to avoid blocking legitimate resume conversation, while the output-side check can afford to be broader since it never blocks anything.

### 3. Pre-filter is deliberately conservative (favors false negatives over false positives)
Given `harden-chat-prompt-injection`'s post-response check already exists as a safety net, this pre-filter only needs to catch the unambiguous cases cheaply — it does not need to be exhaustive. An off-topic message that slips past the pre-filter still gets a normal (if unhelpful) response, and if that response leaks anything, the post-response check still flags it. This framing keeps the pattern list small and low-maintenance rather than growing into an arms race.

## Risks / Trade-offs

- [Server-side export compilation duplicates/moves rendering logic that currently lives client-side, adding server compute cost per export] → Acceptable: exports are a one-time, deliberate user action (not a per-message cost like chat), and the same rendering library runs server-side in a Next.js API route without issue.
- [Deterministic phrase-list pre-filter can be evaded by rephrasing] → Accepted per Decision 3 — the post-response check in `harden-chat-prompt-injection` is the actual safety net; this pre-filter is a cost-saving fast path for the obvious cases, not the primary defense.
- [A user could still screenshot/retype their visible resume preview to bypass paying entirely] → Explicitly out of scope (Non-Goals) — not a defect introduced or fixable by this change.

## Migration Plan

No data migration. Ship export-authorization and chat-intent-prefilter independently — neither depends on the other. Export: land the new API routes, then switch `ExportControls.tsx` to call them (client-side compilation code can be deleted once the switch lands, not before, to keep a working fallback during review). Intent pre-filter: purely additive to `handleChatRequest.ts`, revertible by removing the check.
