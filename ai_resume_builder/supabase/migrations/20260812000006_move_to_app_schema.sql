-- move-to-app-schema (db-layer-data-management)
--
-- Moves all application tables and functions from `public` to a dedicated
-- `app` schema. Motivation: Supabase provisions
-- `alter default privileges ... grant all on tables to anon, authenticated,
-- service_role` for the `public` schema specifically at project creation.
-- A brand-new schema gets no such default grant, so every future table
-- starts deny-by-default and must be explicitly granted access — this
-- structurally prevents the class of bug fixed in
-- 20260812000005_fix_profiles_column_grant_bypass.sql from recurring.
--
-- Prerequisite (not doable via SQL, dashboard-only): the `app` schema must
-- already exist and be added under Project Settings > Data API >
-- Exposed Schemas before this migration is applied, or PostgREST will not
-- serve it to clients.

grant usage on schema app to anon, authenticated, service_role;

-- Move tables. `alter table ... set schema` preserves columns, constraints,
-- indexes, the RLS-enabled flag, RLS policies, and existing grants —
-- only the object's schema changes.
alter table public.profiles set schema app;
alter table public.user_credits set schema app;
alter table public.resumes set schema app;
alter table public.credit_ledger set schema app;
alter table public.analytics_events set schema app;

-- Strip the leftover `public`-schema default grants that were baked into
-- user_credits/credit_ledger/analytics_events at creation time (harmless in
-- practice, since RLS has no permissive write policy on these tables, but
-- redundant broad ACL entries are worth cleaning up while we're here).
revoke all on app.user_credits from authenticated, anon;
grant select on app.user_credits to authenticated;

revoke all on app.credit_ledger from authenticated, anon;
grant select on app.credit_ledger to authenticated;

revoke all on app.analytics_events from authenticated, anon;
grant select on app.analytics_events to authenticated;

revoke all on app.resumes from anon;

-- Move + rewrite functions. `alter function ... set schema` moves the
-- object (and is what keeps the existing on_auth_user_created trigger,
-- which references the function by OID, working without redefinition) but
-- does NOT rewrite the function body — the bodies below explicitly
-- schema-qualify `public.*` table references, so each is re-defined with
-- `app.*` references and `search_path = app` after the move.
alter function public.reserve_chat_credit(uuid, text, integer) set schema app;
alter function public.refund_chat_credit(uuid, text, integer, text) set schema app;
alter function public.handle_new_user() set schema app;

create or replace function app.reserve_chat_credit(
  p_user_id uuid,
  p_request_id text,
  p_cost integer
)
returns table (success boolean, new_balance integer)
language plpgsql
security invoker
set search_path = app
as $$
declare
  v_new_balance integer;
begin
  update app.user_credits
  set credits_remaining = credits_remaining - p_cost,
      updated_at = now()
  where user_id = p_user_id
    and credits_remaining >= p_cost
  returning credits_remaining into v_new_balance;

  if v_new_balance is null then
    select credits_remaining into v_new_balance
    from app.user_credits
    where user_id = p_user_id;

    return query select false, coalesce(v_new_balance, 0);
    return;
  end if;

  insert into app.credit_ledger (user_id, amount, reason, request_id)
  values (p_user_id, p_cost, 'reservation', p_request_id);

  return query select true, v_new_balance;
end;
$$;

create or replace function app.refund_chat_credit(
  p_user_id uuid,
  p_request_id text,
  p_amount integer,
  p_reason text default 'refund'
)
returns table (success boolean, new_balance integer)
language plpgsql
security invoker
set search_path = app
as $$
declare
  v_new_balance integer;
begin
  update app.user_credits
  set credits_remaining = credits_remaining + p_amount,
      updated_at = now()
  where user_id = p_user_id
  returning credits_remaining into v_new_balance;

  if v_new_balance is null then
    return query select false, 0;
    return;
  end if;

  insert into app.credit_ledger (user_id, amount, reason, request_id)
  values (p_user_id, -p_amount, p_reason, p_request_id);

  return query select true, v_new_balance;
end;
$$;

create or replace function app.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = app
as $$
begin
  insert into app.profiles (user_id, email)
  values (new.id, new.email);

  insert into app.user_credits (user_id)
  values (new.id);

  return new;
end;
$$;

-- Re-apply the defense-in-depth grants from
-- 20260812000004_harden_function_security.sql. `alter function set schema`
-- preserves existing grants/revokes, but re-stating them here keeps this
-- migration self-contained and correct even if replayed against a fresh
-- database (e.g. `supabase db reset`), where schema moves start from the
-- original public-schema definitions.
revoke all on function app.reserve_chat_credit(uuid, text, integer) from public;
revoke all on function app.refund_chat_credit(uuid, text, integer, text) from public;
grant execute on function app.reserve_chat_credit(uuid, text, integer) to service_role;
grant execute on function app.refund_chat_credit(uuid, text, integer, text) to service_role;
revoke all on function app.handle_new_user() from public, anon, authenticated;
