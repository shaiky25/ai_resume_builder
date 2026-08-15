-- payment-transactions-schema (payment-gatekeeping)
--
-- Tracks the lifecycle of a single checkout session from creation
-- (status='pending') through the webhook-verified outcome
-- (status='succeeded'|'failed'). One row per (provider, provider_session_id)
-- serves as both the reconciliation log entry (amount, provider
-- transaction/session id, provider name, timestamp) and the source of truth
-- the "processing" UI state polls/subscribes to — see
-- record_payment_result below for how this doubles as the idempotency gate.

create table if not exists app.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null,
  provider_session_id text not null,
  provider_transaction_id text,
  status text not null default 'pending' check (status in ('pending', 'succeeded', 'failed')),
  amount_cents integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_session_id)
);

create index if not exists payment_transactions_user_id_idx on app.payment_transactions (user_id);

alter table app.payment_transactions enable row level security;

create policy "payment_transactions_select_own"
  on app.payment_transactions
  for select
  using (auth.uid() = user_id);

-- Read-only client grant (schema usage already granted to authenticated in
-- 20260812000006_move_to_app_schema.sql). Rows are only ever written by the
-- service-role client (checkout-session creation inserts the pending row;
-- the webhook handler transitions it via record_payment_result below).
grant select on app.payment_transactions to authenticated;

alter publication supabase_realtime add table app.payment_transactions;

-- Atomically transitions a pending checkout session to its verified outcome
-- and, on success, grants has_premium_download_access — in one statement so
-- a webhook retry for an already-processed session can never double-grant
-- or double-log. The WHERE status = 'pending' guard IS the idempotency
-- check: a session can only ever leave 'pending' once, so a duplicate
-- delivery (or a delivery for an unknown session_id) matches zero rows and
-- `processed` comes back false with no side effects, while the handler
-- still returns success to the provider (idempotent-safe retry semantics).
--
-- SECURITY INVOKER: only ever called via the service-role client (already
-- bypasses RLS); EXECUTE is revoked from non-service roles below as
-- defense in depth, matching reserve_chat_credit/refund_chat_credit.
create or replace function app.record_payment_result(
  p_provider text,
  p_provider_session_id text,
  p_status text,
  p_provider_transaction_id text,
  p_amount_cents integer
)
returns table (processed boolean, user_id uuid)
language plpgsql
security invoker
set search_path = app
as $$
declare
  v_user_id uuid;
begin
  if p_status not in ('succeeded', 'failed') then
    raise exception 'invalid payment status: %', p_status;
  end if;

  update app.payment_transactions
  set status = p_status,
      provider_transaction_id = p_provider_transaction_id,
      amount_cents = p_amount_cents,
      updated_at = now()
  where provider = p_provider
    and provider_session_id = p_provider_session_id
    and status = 'pending'
  returning payment_transactions.user_id into v_user_id;

  if v_user_id is null then
    return query select false, null::uuid;
    return;
  end if;

  if p_status = 'succeeded' then
    update app.profiles
    set has_premium_download_access = true
    where profiles.user_id = v_user_id;
  end if;

  return query select true, v_user_id;
end;
$$;

revoke all on function app.record_payment_result(text, text, text, text, integer) from public, anon, authenticated;
grant execute on function app.record_payment_result(text, text, text, text, integer) to service_role;
