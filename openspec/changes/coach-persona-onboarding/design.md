## Context

See proposal.md - Why. Two decisions were flagged during architect review as needing to be locked in before implementation, since both close concrete, foreseeable gaps rather than being style preferences:

1. `coach_persona` is proposed as "a new `coach_persona` column on `profiles`, client-writable under the same RLS/grant pattern as `display_name`/`plan_tier`" — but unlike `display_name` (genuinely free text), `coach_persona` only ever needs to be one of three fixed values, and the proposal also states the server "appends a persona-specific tone-modifier block to the Impact-Writer Master Prompt, read from the user's stored `profiles.coach_persona`." If that read is ever interpolated into the system prompt as raw text rather than switched on a fixed set, an unconstrained column becomes a user-writable, server-side-trusted prompt-injection surface — the user attacking their own conversation's persona, but still a real class of bug given the trust boundary work already done for `chat-system-prompt-injection`.
2. `close-integration-gaps` already established the Realtime-subscription-only read pattern for `has_premium_download_access` (`usePremiumDownloadAccess.ts`) with no reconnect/refetch fallback if the websocket drops — a gap noted during that change's review but not fixed there. This proposal's own "change coaching style" affordance and persona-gate read (`profiles.coach_persona`) would repeat that same pattern if built the same way; worth deciding the fallback shape once, here, rather than shipping a second instance of the same gap.

## Goals / Non-Goals

**Goals:**
- Make `coach_persona` structurally incapable of carrying injectable free text, independent of how carefully the prompt-composition code is written later.
- Give the persona read path (and, by the same pattern, any future Realtime-based profile read) a defined fallback so a dropped websocket doesn't silently strand a user on stale state.

**Non-Goals:**
- Full UI/visual design of the picker screen, sample coach lines, or exact tone-modifier wording — those are implementation-level content decisions, not spec-level contracts.
- Redesigning `usePremiumDownloadAccess.ts` itself — this design only decides the fallback *pattern* to apply here and recommends it be back-ported there as a follow-up, not as part of this change's scope.

## Decisions

### 1. `coach_persona` is a Postgres enum, not free text
Define `profiles.coach_persona` as `text` constrained by a `check (coach_persona in ('momentum', 'steady', 'bold'))` (or a native Postgres enum type, following whatever convention `db-layer-data-management` already uses for similar fixed-choice columns) rather than unconstrained `text`. Server-side prompt composition switches on this fixed set of values to select a tone-modifier block — it never interpolates the stored value directly into prompt text. A write attempting any value outside the three fails at the database layer, not just at the application layer, so the constraint holds even if a future code path writes to this column without going through today's UI.

Alternative considered: unconstrained `text`, matching `display_name`. Rejected — `display_name` is genuinely free text with no downstream trust implication; `coach_persona` is a fixed enumeration by design (exactly three options, chosen from a picker) and is read back into a server-trusted prompt-composition path, so constraining it costs nothing (the app never needs a fourth value without a migration anyway) and removes an entire class of self-directed injection risk.

### 2. Realtime reads use a visibility-triggered refetch fallback, not Realtime alone
Any Realtime subscription this change adds (persona read, or reuse of the existing profile-row subscription) pairs the `postgres_changes` listener with a refetch triggered on the browser tab regaining visibility (`document.visibilitychange` → refetch if now visible) and on the subscription's own `SUBSCRIBED`/reconnect callback firing after a drop. This mirrors the initial-fetch-plus-subscribe shape `usePremiumDownloadAccess.ts` already has, adding only the missing reconnect/visibility refetch leg — not a new read pattern.

Alternative considered: polling as a second read path alongside Realtime. Rejected, consistent with `close-integration-gaps`'s own decision to standardize on Realtime over polling — a visibility-triggered refetch closes the "silently stale after a dropped socket" gap without introducing a second, always-on read mechanism.

**Recommendation (not in this change's scope):** apply the same visibility-triggered refetch fallback to `usePremiumDownloadAccess.ts`, since it has the identical gap and gates a paid conversion moment — worth a small follow-up task against `close-integration-gaps` or a standalone fix once this pattern is proven here.

## Risks / Trade-offs

- [Enum constraint means adding a fourth persona later requires a migration] → Acceptable — persona options are a deliberate, small, curated set by product design, not something expected to grow casually; a migration for a genuinely new persona is the right amount of friction.
- [Visibility-triggered refetch adds a small amount of extra reads on tab-focus churn] → Negligible — a single row fetch on tab refocus, not a polling loop.

## Migration Plan

No migration for the fallback pattern (client-side only). The `coach_persona` column migration should define the check constraint (or enum type) from the start, so there is no separate "add constraint later" step — this needs to land as part of the same migration the proposal already calls for, not a follow-up.
