## Why

The chat assistant currently rewrites resume content in the abstract — the Impact-Writer Master Prompt has no notion of a specific job the user is applying to, so its output is generically "better" rather than deliberately positioned to survive ATS keyword filters and catch a recruiter's eye for a particular role. Users' actual goal is a resume tailored to a target job, not a general polish.

## What Changes

- Let the user supply a target job (title/company + full job description text) that anchors the current resume session.
- Derive a tailoring strategy after each turn: keyword/skill coverage between the target job description and the user's structured resume data, plus prioritized rewrite guidance (what to emphasize, reorder, or add).
- Feed that tailoring strategy into the server-side assembled prompt so the assistant's rewrites are directed at the target job, not generic improvement.
- Surface match coverage (matched vs. missing keywords/skills, prioritized gaps) back to the user so they can see how the resume currently fits the target job.
- Constrain tailoring to repositioning the user's existing experience in the target job's language — never inventing experience, skills, or credentials the user doesn't have — and flag target jobs that have no reasonable relevance to the user's background instead of force-fitting them.
- Structure rewrite guidance for experience bullets using an accomplishment-metric-method format, naturally weaving in missing keywords only where grounded in real experience, and explicitly flag red flags (gaps, vague/unquantified statements, irrelevant content) for removal or reframing.
- Ask the user for confirmation before applying any suggested changes to their resume; never apply changes unprompted.
- Withhold PDF/DOCX export until the user is satisfied with the optimized resume — determined either by the user explicitly asking to export, or by the system deducing readiness through relevant follow-up questions — on top of the existing readiness-and-payment gate.

## Capabilities

### New Capabilities
- `job-target-input`: Lets the user provide and persist a target job (title, company, full job description text) that anchors the resume session.
- `resume-optimization-strategy`: Derives a tailoring strategy (keyword/skill gap coverage, prioritized rewrite guidance) from the target job description and the user's structured resume data, recomputed after each turn.
- `resume-match-insights`: Surfaces the tailoring strategy's match coverage (matched/missing keywords or skills, prioritized gaps) to the user in the UI.

### Modified Capabilities
- `chat-system-prompt-injection`: The server-side composed prompt SHALL also include the derived tailoring strategy for the user's target job (when one is set), alongside the existing LinkedIn/resume context.
- `premium-download-gate`: Export SHALL additionally require confirmed user satisfaction with the optimized resume when the user has a target job set, on top of the existing readiness-and-payment conditions.

## Impact

- `POST /api/chat` route: prompt assembly step gains an additional context source (tailoring strategy).
- `resumes` table (Supabase): needs to persist the target job (title/company/description) and the derived tailoring strategy/match coverage per user.
- Resume-structured-extraction pipeline: tailoring strategy derivation runs alongside/after existing structured-data extraction, on the same per-turn cadence.
- Chat/resume UI: new input surface for the target job, and a display for match coverage/gaps (likely near the resume preview pane).
