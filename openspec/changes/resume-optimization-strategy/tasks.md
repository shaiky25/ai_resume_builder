## 1. Data model

- [x] 1.1 Add target-job columns to `resumes` (job title, company, description text), nullable, owner-scoped RLS matching existing `resumes` policy
- [x] 1.2 Add tailoring-strategy columns to `resumes` (structured JSON: matched/missing keywords-skills, prioritized gaps, low-relevance flag), nullable, same RLS scope
- [x] 1.3 Add baseline-assessment columns to `resumes` (match score 0-100, top five missing keywords, top three red flags), nullable, same RLS scope

## 2. Target job input (job-target-input)

- [x] 2.1 Add UI surface for the user to submit/update job title, company, and job description text
- [x] 2.2 Wire submission to persist the target job scoped to the authenticated user, replacing any previous value
- [x] 2.3 Enforce owner-scoped RLS on the new target-job columns/table access

## 3. Tailoring strategy derivation (resume-optimization-strategy)

- [x] 3.1 Add tailoring-strategy derivation step to the existing post-turn hook that runs structured extraction, gated on the user having a target job set
- [x] 3.2 Author the baseline-assessment prompt/instructions (senior-recruiter-for-this-company framing): match score out of 100, top five missing keywords, top three red flags a hiring manager would spot quickly
- [x] 3.3 Run the baseline assessment step first on a newly set/changed target job, and gate rewrite-guidance generation until it completes
- [x] 3.4 Author the rewrite-guidance derivation prompt/instructions: ground all guidance in the user's structured resume data only, no fabricated experience/skills/credentials
- [x] 3.5 Implement missing-requirement handling: surface JD requirements absent from structured resume data as gaps, not as fabricated matches
- [x] 3.6 Implement low-relevance detection: flag the target job instead of producing rewrite guidance when there's no meaningful overlap with the user's existing experience
- [x] 3.7 Structure experience-bullet rewrite guidance as accomplishment-metric-method, weaving in missing keywords only where grounded in real experience
- [x] 3.8 Implement red-flag identification (gaps, vague/unquantified statements, irrelevant content) with remove-or-reframe guidance
- [x] 3.9 Persist the baseline assessment and derived strategy scoped to the user, replacing previous values
- [x] 3.10 Isolate derivation failures from the chat turn's response (mirror `resume-structured-extraction`'s failure handling)
- [x] 3.11 Skip derivation entirely (no-op) when no target job is set
- [x] 3.12 After rewrite guidance is generated, have the assistant ask the user whether to apply the suggested changes, and withhold applying them until confirmed
- [x] 3.13 Apply suggested changes to the resume only upon explicit user confirmation
- [x] 3.14 Implement satisfaction determination: explicit user request to export, or system-deduced readiness from follow-up questions the assistant asks
- [x] 3.15 Persist the satisfaction signal per user/target job so the export gate (see `premium-download-gate`) can read it

## 4. Prompt injection (chat-system-prompt-injection)

- [x] 4.1 Extend server-side prompt assembly to append target job description + tailoring strategy when present, sourced from Supabase only
- [x] 4.2 Ensure no target-job/tailoring content is appended when the user has no target job set

## 5. Match insights UI (resume-match-insights)

- [x] 5.1 Add UI surface (near resume preview) showing the baseline assessment: match score out of 100, top five missing keywords, top three red flags
- [x] 5.2 Show the baseline assessment as pending (not an empty/broken state) between target job submission and baseline completion
- [x] 5.3 Add UI surface showing matched/missing keywords-skills and prioritized gaps from the current tailoring strategy, once rewrite guidance exists
- [x] 5.4 Show a low-relevance notice instead of match coverage when the strategy has flagged the target job as low-relevance
- [x] 5.5 Hide the insights surface entirely when no target job is set
- [x] 5.6 Refresh displayed insights when a new baseline or tailoring strategy is derived after a subsequent turn

## 6. Export gate (premium-download-gate)

- [x] 6.1 Extend export-enablement check to require satisfaction determination when the user has a target job set (readiness + payment unchanged when no target job)
- [x] 6.2 Add explicit as-built export override: allow export when the user explicitly asks, even if the resume isn't ready or satisfaction isn't yet determined, provided payment access is present
- [x] 6.3 Confirm the export-enablement change still reacts live to `has_premium_download_access` changes without a reload

## 7. Verification

- [x] 7.1 Verify RLS: a user cannot read/write another user's target job or tailoring strategy
- [x] 7.2 Verify prompt payloads never leak the tailoring strategy's raw derivation prompt/instructions to the client (consistent with existing Master Prompt secrecy)
- [x] 7.3 Manually test the flagged example case (e.g., a teacher's resume against an unrelated full-stack engineer JD) to confirm the low-relevance flag fires instead of fabricated repositioning
- [ ] 7.4 Manually test confirm-before-apply: suggested changes never touch the resume before the user confirms
- [ ] 7.5 Manually test the as-built export override: a not-yet-ready resume becomes exportable the moment the user explicitly asks, without needing to be "ready" first
