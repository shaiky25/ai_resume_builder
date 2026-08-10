-- user-credits-schema (db-layer-data-management)
--
-- The single most important boundary in the system: a client can never
-- write to its own credit balance. Owner-read-only via RLS; zero
-- client-side write policies of any kind. Every write goes through the
-- service-role key inside /api/chat (or its reserve/refund RPCs).

create table if not exists public.user_credits (
  user_id uuid primary key references auth.users (id) on delete cascade,
  credits_remaining integer not null default 5,
  payment_status text not null default 'none',
  updated_at timestamptz not null default now()
);

alter table public.user_credits enable row level security;

create policy "user_credits_select_own"
  on public.user_credits
  for select
  using (auth.uid() = user_id);

-- Read-only client grant. Deliberately no insert/update/delete grant and no
-- corresponding RLS policy — see design.md: "user_credits has zero
-- client-side write policies, not a restrictive one."
grant select on public.user_credits to authenticated;
