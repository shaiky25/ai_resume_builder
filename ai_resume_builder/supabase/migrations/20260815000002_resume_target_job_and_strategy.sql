-- resume-optimization-strategy (job-target-input, resume-optimization-strategy)
--
-- Adds target-job, tailoring-strategy, baseline-assessment, and
-- satisfaction/export-signal columns to app.resumes. All nullable/defaulted
-- so existing rows and the existing generic-rewrite flow are unaffected
-- until a user sets a target job (additive-only migration per design.md).
--
-- No new RLS policies are needed: these are new columns on the existing
-- app.resumes table, already owner-scoped via the resumes_select_own /
-- resumes_insert_own / resumes_update_own / resumes_delete_own policies
-- (auth.uid() = user_id), which apply at the row level regardless of which
-- columns are read or written.

alter table app.resumes
  add column if not exists target_job_title text,
  add column if not exists target_job_company text,
  add column if not exists target_job_description text,
  add column if not exists tailoring_strategy jsonb,
  add column if not exists baseline_assessment jsonb,
  add column if not exists optimization_satisfied boolean not null default false,
  add column if not exists export_requested boolean not null default false;
