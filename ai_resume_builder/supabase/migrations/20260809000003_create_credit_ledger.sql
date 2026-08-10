-- credit-ledger-schema (db-layer-data-management)
--
-- Every credit reservation, decrement, and compensating refund, so the
-- Backend & Security layer's reserve-before-call / refund-on-failure
-- pattern has an auditable, service-role-only-writable log. Follows the
-- same owner-read/service-role-write pattern as user_credits.
--
-- amount sign convention (per spec): positive for a reservation/decrement,
-- negative for a refund.

create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  amount integer not null,
  reason text not null,
  request_id text not null,
  created_at timestamptz not null default now()
);

create index if not exists credit_ledger_user_id_idx on public.credit_ledger (user_id);
create index if not exists credit_ledger_request_id_idx on public.credit_ledger (request_id);

alter table public.credit_ledger enable row level security;

create policy "credit_ledger_select_own"
  on public.credit_ledger
  for select
  using (auth.uid() = user_id);

-- Read-only client grant. No client-side write policy exists on this table.
grant select on public.credit_ledger to authenticated;
