-- coach-persona-onboarding
--
-- Adds app.profiles.coach_persona: the user's chosen coaching style, read
-- back server-side into prompt composition (chat-system-prompt-injection).
-- Constrained to a fixed set at the database layer (design.md decision 1)
-- rather than left as unconstrained text like display_name — this column is
-- read into a server-trusted prompt-composition path, so a check constraint
-- makes it structurally incapable of carrying injectable free text,
-- independent of how the prompt-composition code is written later. Nullable:
-- unset until the user completes the persona picker.

alter table app.profiles
  add column if not exists coach_persona text
    constraint profiles_coach_persona_check
    check (coach_persona in ('momentum', 'steady', 'bold'));

-- Owner-scoped write, same column-level grant pattern as
-- email/display_name/plan_tier (20260812000005_fix_profiles_column_grant_bypass.sql).
-- Table-wide SELECT is already granted to authenticated, so no separate read
-- grant is needed.
grant update (coach_persona) on app.profiles to authenticated;
