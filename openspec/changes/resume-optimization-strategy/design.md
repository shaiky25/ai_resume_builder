## Context

See proposal.md - Why. Relevant existing pieces this change builds on:
- `chat-system-prompt-injection`: server-side assembles the Master Prompt with LinkedIn/resume context pulled from Supabase.
- `resume-structured-extraction`: after each successful chat turn, derives and persists `resumes.structured_output`, with failures isolated from the chat response.
- `resumes-schema`: `resumes` table, owner-scoped via RLS on `user_id`.
- `resume-preview-pane`: existing UI surface next to chat where resume state is shown.

## Goals / Non-Goals

**Goals:**
- Give the assistant a specific job to tailor toward, sourced entirely server-side (consistent with the existing prompt-injection trust boundary).
- Recompute the tailoring strategy on the same per-turn cadence as structured extraction, with the same failure-isolation guarantee.
- Give the user a visible signal (match coverage) of how well their resume currently fits the target job.

**Non-Goals:**
- No automated JD scraping/import from a URL — the user pastes the job description text directly.
- No multi-job comparison in this change — one target job per resume session at a time.
- The match score is a model-generated estimate for orientation, not a certified or reproducible ATS score — no guarantee of consistency with any specific employer's actual ATS.

## Decisions

- **Storage shape**: extend the existing `resumes` table with target-job columns (title, company, description text) and tailoring-strategy columns (structured JSON), rather than introducing new tables. Rationale: target job and tailoring strategy are 1:1 with a user's resume session today, mirroring how `structured_output` already lives on `resumes`; a separate table would need the same RLS policy duplicated for no benefit. Alternative considered: a dedicated `target_jobs` table — deferred until multi-job support is actually needed.
- **Derivation trigger**: piggyback the tailoring-strategy derivation on the same post-turn hook that runs structured extraction (`resume-structured-extraction`), rather than a separate async job or a user-triggered "analyze" button. Rationale: keeps the two derivations consistent with each other (both reflect the same conversation state) and reuses the existing failure-isolation pattern instead of building a second one.
- **Prompt injection point**: extend the same server-side assembly step in `chat-system-prompt-injection` that appends resume/LinkedIn context, rather than a separate prompt-building path. Rationale: one server-side assembly point is easier to keep un-tamperable from the client; a second path would duplicate that trust boundary.
- **Integrity guardrail**: the anti-fabrication and relevance-flagging constraints are enforced as instructions to the model within the tailoring-strategy derivation step (and echoed into the assembled Master Prompt context) rather than a separate deterministic validation pass. Rationale: "relevant experience" and "reasonable overlap" are judgment calls the model is already positioned to make from the structured resume data and job description; a keyword-matching validator would either be too strict (rejecting legitimate reframing) or too permissive (missing fabrication phrased plausibly). Trade-off accepted below.
- **Rewrite guidance format**: rewrite guidance is expressed as an accomplishment-metric-method structure (what was accomplished, measured by what result, achieved by what method), with missing keywords woven in only where grounded in real experience, and red flags (gaps, vague/unquantified bullets, irrelevant content) explicitly flagged for removal or reframing. Rationale: this is the same structure the existing Impact-Writer Master Prompt already aims for in generic rewriting; this change makes it JD-aware rather than introducing a new format.
- **Baseline-before-rewrite sequencing**: setting/changing a target job triggers a baseline assessment (match score /100, top 5 missing keywords, top 3 red flags) as a distinct derivation step that must complete and be shown before rewrite guidance is generated for that target job. Rationale: the user should see an honest "where you stand" read before the assistant starts changing anything, framed the way a senior recruiter for that company would size up the resume in a first pass — rather than jumping straight to edits with no baseline to compare against.
- **Confirm-before-apply**: rewrite guidance is presented as a proposal the assistant asks about ("want me to apply these changes?"); the resume is only mutated after explicit user confirmation. Rationale: matches the "before making any change" instruction directly — the user drives when their resume actually changes, the assistant never edits silently mid-conversation.
- **Satisfaction signal**: satisfaction (which gates export once a target job is set) is derived the same way as the confirm-before-apply signal — either an explicit user statement ("I'm ready to export") or the model inferring readiness from its own follow-up readiness questions — rather than a separate deterministic checklist/progress bar. Rationale: matches how the rest of this flow already works conversationally; a rigid checklist would fight the chat-first interaction model the rest of the product uses. Trade-off: it inherits the same reliability caveat as the other model-judgment guardrails above.
- **Explicit as-built export override**: an explicit user request to export always works, even when the resume isn't yet "ready" or (with a target job set) satisfaction hasn't been determined. Rationale: the readiness/satisfaction gates exist to guide the *default* flow toward a finished, tailored resume, not to trap a user who just wants what they've built so far — payment (`has_premium_download_access`) remains the one condition that is never bypassed.

## Risks / Trade-offs

- [Derivation adds latency/cost to the post-turn hook] → It already tolerates failure without blocking the user-visible response (per `resume-structured-extraction`'s pattern); the tailoring strategy derivation reuses that same non-blocking guarantee.
- [Pasted job descriptions are unstructured text and may be long/noisy] → Treated as opaque text passed to the derivation step and the prompt, same as resume/LinkedIn text already is; no upfront parsing requirement introduced by this change.
- [Match insights could be misread as a guaranteed ATS score] → UI framing (in implementation) should present it as directional coverage/gaps, not a certified score; this is a presentation concern, not a spec requirement, since no scenario promises numeric accuracy.
- [Model-enforced integrity guardrail could still fabricate or over-reposition, since it isn't a deterministic check] → mitigate with explicit, testable instructions in the derivation prompt (ground every claim in structured resume data; flag rather than bridge large gaps) and treat egregious cases (e.g., unrelated occupations) as the low-relevance flag path rather than relying on the guardrail alone.

## Migration Plan

- Additive only: new columns on `resumes` (nullable, no target job set by default) and new UI surfaces. Existing users with no target job continue to get today's generic rewriting behavior (`resume-optimization-strategy`'s "No tailoring strategy applied without a target job" requirement).
- No backfill needed — tailoring strategy only exists once a user sets a target job.
- Rollback: revert the prompt-assembly change and hide the new UI surfaces; the added columns can remain unused without affecting existing behavior.
