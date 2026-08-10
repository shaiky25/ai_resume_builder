-- profiles-schema (db-layer-data-management)
--
-- Basic per-user profile information, owner-scoped read/write, with a
-- column-level carve-out: has_premium_download_access is client-readable
-- but only service-role-writable (design.md decision: column-level REVOKE,
-- option (a), rather than a BEFORE UPDATE trigger).

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  plan_tier text not null default 'free',
  has_premium_download_access boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles
  for select
  using (auth.uid() = user_id);

create policy "profiles_insert_own"
  on public.profiles
  for insert
  with check (auth.uid() = user_id);

create policy "profiles_update_own"
  on public.profiles
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Client-side (anon key + user JWT) grants.
--
-- IMPORTANT: has_premium_download_access is deliberately left out of the
-- UPDATE column list below, not granted-then-revoked. In Postgres, a
-- table-level `GRANT UPDATE` and a column-level `REVOKE UPDATE (col)` are
-- independent ACL entries — a privilege check passes if EITHER permits it,
-- so revoking a column after a table-wide grant would NOT actually block
-- writes to that column (the table-wide grant still wins). The only way to
-- truly restrict a single column is to never grant table-wide UPDATE and
-- instead grant UPDATE on exactly the columns that should be writable.
grant select, insert on public.profiles to authenticated;
grant update (email, display_name, plan_tier) on public.profiles to authenticated;

-- service_role bypasses RLS entirely and is the only writer of
-- has_premium_download_access (e.g. the payment layer's webhook handler).
