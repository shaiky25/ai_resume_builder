-- analytics-events-schema (db-layer-data-management)
--
-- Post-stream usage events, written by the Backend & Security layer's
-- /api/chat route after each completed stream. Same owner-read /
-- service-role-write pattern as user_credits and credit_ledger.

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  request_id text not null,
  event_type text not null default 'chat_completion',
  usage jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_user_id_idx on public.analytics_events (user_id);
create index if not exists analytics_events_request_id_idx on public.analytics_events (request_id);

alter table public.analytics_events enable row level security;

create policy "analytics_events_select_own"
  on public.analytics_events
  for select
  using (auth.uid() = user_id);

-- Read-only client grant. No client-side write policy exists on this table.
grant select on public.analytics_events to authenticated;
