-- resumes-schema (db-layer-data-management)
--
-- Each user's raw parsed LinkedIn/resume text input alongside Claude's
-- final structured resume output. Owner-scoped read/write (unlike
-- user_credits/credit_ledger/analytics_events, clients may write their own
-- rows here) — this is the /api/chat route's server-side source of truth
-- for a user's resume/LinkedIn context, read via the service-role client.

create table if not exists public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  raw_text text,
  structured_output jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists resumes_user_id_idx on public.resumes (user_id);
create index if not exists resumes_user_id_updated_at_idx on public.resumes (user_id, updated_at desc);

alter table public.resumes enable row level security;

create policy "resumes_select_own"
  on public.resumes
  for select
  using (auth.uid() = user_id);

create policy "resumes_insert_own"
  on public.resumes
  for insert
  with check (auth.uid() = user_id);

create policy "resumes_update_own"
  on public.resumes
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "resumes_delete_own"
  on public.resumes
  for delete
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.resumes to authenticated;
