## Context

Today `CHAT_MODEL = "claude-opus-5"` (`anthropicClient.ts`) is the single model constant used by both `streamChat` (conversational reply) and `extractResume` (`resumeExtraction.ts`, forced tool-use against a fixed 4-field schema). `promptComposer.ts` rebuilds the full system prompt — master prompt + `rawText` + `structuredOutput` — from scratch on every turn with no `cache_control`. `handleChatRequest.ts` calls `extractResume` with `[...history, newUserMsg, newAssistantMsg]` — the entire transcript, every turn. See `proposal.md` for why this matters now (no per-user cost ceiling beyond the credit gate, going to general public).

## Goals / Non-Goals

**Goals:**
- Decouple model choice for the extraction call from the conversational call.
- Cache the invariant/slow-changing parts of the system prompt across turns.
- Make per-turn extraction cost independent of total conversation length.

**Non-Goals:**
- Changing the conversational model tier's *behavior/quality* target — Opus stays the conversational default unless a future change decides otherwise; this design only makes it possible to vary independently of extraction.
- Changing the `resumes.structured_output` schema or the `RESUME_EXTRACTION_TOOL` fields.
- File-upload/parsing input methods — separate change.

## Decisions

### 1. Separate model constants per call shape
Split `CHAT_MODEL` into two independent constants (e.g. `CONVERSATION_MODEL`, `EXTRACTION_MODEL`) in `anthropicClient.ts`, each passed explicitly by its call site. `streamChat` keeps `claude-opus-5`. `extractResume` defaults to `claude-haiku-4-5-20251001`.

**Rollout for the extraction tier** (per your call): ship Haiku 4.5 first, then run a second pass on Sonnet 5 against the same sample conversations and compare. Decision criterion: field-level accuracy (name/title/summary/experience entries) on a small hand-checked eval set (~10-15 real-shaped conversations, varying messiness) — if Haiku's output matches Sonnet's closely enough that a human reviewer wouldn't prefer one over the other, keep Haiku; if Haiku visibly drops or garbles fields Sonnet gets right, move `EXTRACTION_MODEL` to Sonnet. This comparison is a manual/scripted exercise run against the real Anthropic API (costs real tokens) — not part of this change's automated test suite, and not something to run from an assistant session; it's a task for whoever implements this to run locally with their own API key.

Alternative considered: keep one shared constant and just lower it for both calls. Rejected — the conversational call is the actual product surface (quality-sensitive, user-facing); the extraction call is invisible plumbing. Coupling them means any future extraction-cost fix risks conversational quality, and vice versa.

### 2. Prompt caching via a single combined breakpoint
Add one `cache_control: { type: "ephemeral" }` breakpoint covering the master prompt + resume context together as one system-prompt block, rather than two separate breakpoints (master prompt alone; resume context alone). The master prompt is short (~17 lines) and likely sits below most models' minimum cacheable-block token threshold on its own — combining it with the resume context (which varies per user but is stable *within* a session) gets the combined block over that minimum reliably. Recompute/invalidate the cached block only when `resumeContext` changes (i.e., cache key effectively follows `structured_output`'s `updated_at`), not on every turn.

**Verify at implementation time**: exact minimum-cacheable-token thresholds per model (they differ by model family/generation and may have changed) — confirm against current Anthropic API docs rather than assuming a fixed number here.

Alternative considered: cache master prompt and resume context as two separate breakpoints for finer-grained invalidation. Rejected for now — added complexity (two breakpoints to manage, two invalidation triggers) isn't justified when the master prompt is static across *all* users and essentially free to recompute; the only per-user-varying, worth-caching content is the resume context itself.

### 3. Incremental extraction instead of full-transcript re-send
Replace `[...history, newUserMsg, newAssistantMsg]` with `[previously-persisted structuredOutput as compact context, newUserMsg, newAssistantMsg]` — i.e. extraction becomes "merge this turn's new information into what we already know," not "re-derive everything from the full transcript." This turns per-turn extraction cost from O(conversation length) into O(1) (bounded to ~2 messages + the existing structured JSON, which is already fetched once per request via `resumeContextGateway.getLatestResumeContext`), and total session extraction cost from O(n²) into O(n).

Requires updating `RESUME_EXTRACTION_TOOL`'s prompt framing so the model understands it's merging/updating an existing record (preserving prior fields not mentioned in the latest turn) rather than extracting fresh — a prompt-wording change, not a schema change.

Alternative considered: a sliding window (last N turns) instead of incremental-merge. Rejected — a window still re-sends redundant tokens every turn (bounded but not minimal) and risks losing resume-relevant details mentioned early in a long conversation and never repeated; incremental-merge carries them forward via the persisted structured output instead.

## Risks / Trade-offs

- [Haiku under-extracts on nuanced/messy input, e.g. conflating role/company or missing quantified impact phrasing] → Mitigated by the Haiku-then-Sonnet comparison pass in Decision 1 before considering this call site "done"; not a blind swap.
- [Incremental-merge extraction (Decision 3) could let an early wrong field persist indefinitely if never corrected in a later turn, since the model no longer re-derives from full history] → Acceptable trade-off given the extraction output already only feeds the live preview, which the user can see and correct by saying so in chat (the merge step handles corrections the same as new information).
- [Cache breakpoint invalidates every time `structured_output` changes, which happens after nearly every turn once extraction lands] → This bounds the caching benefit to *within* the current turn's own extraction call plus the next turn's conversational call, not across many turns. Still a net win (halves the number of "cold" system-prompt sends per turn) but not the full multi-turn caching win a fully static prompt would get — worth remeasuring after implementation rather than assuming the theoretical maximum.

## Migration Plan

- No data migration — this only changes which model/parameters are sent to Anthropic and how the extraction call composes its input.
- Ship model-constant split (Decision 1, Haiku default) and prompt caching (Decision 2) together — independent, low-risk, immediately measurable via `usageLogger`'s existing `inputTokens`/`outputTokens` logging.
- Ship incremental extraction (Decision 3) as a second step once the extraction-tool prompt rewording is validated against the same eval set used for Decision 1, since it changes extraction *behavior*, not just cost.
- Rollback: each decision is independently revertible (swap constant back, drop `cache_control`, revert to full-transcript extraction) since none change persisted data shape.

## Open Questions

- Exact minimum-cacheable-token threshold per model family — confirm against current Anthropic docs at implementation time (flagged in Decision 2).
