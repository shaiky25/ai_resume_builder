-- fix-profiles-column-grant-bypass (db-layer-data-management)
--
-- 20260809000001_create_profiles.sql intended to restrict `authenticated`
-- UPDATE access to (email, display_name, plan_tier) only, deliberately
-- omitting has_premium_download_access (design.md option a).
--
-- That restriction was never actually in effect: every Supabase project is
-- provisioned with `alter default privileges ... grant all on tables to
-- anon, authenticated, service_role` at the schema level, applied
-- automatically to any table `postgres` creates. This runs independently of
-- migration-defined grants, so `profiles` already had table-wide
-- INSERT/SELECT/UPDATE/DELETE granted to `authenticated` before the
-- column-scoped grant was ever added — the column-scoped grant was
-- additive, not restrictive, since a privilege check passes if EITHER the
-- table-wide or column-level grant permits it.
--
-- Verified live: an `authenticated`-role UPDATE bundling display_name and
-- has_premium_download_access succeeded and changed both columns.
--
-- Fix: revoke the default table-wide grant before re-applying the intended
-- narrow privilege set.

revoke all on public.profiles from authenticated;
revoke all on public.profiles from anon;

grant select, insert on public.profiles to authenticated;
grant update (email, display_name, plan_tier) on public.profiles to authenticated;
