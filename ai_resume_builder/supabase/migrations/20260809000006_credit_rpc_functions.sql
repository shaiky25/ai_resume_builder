-- Atomic reserve/refund RPC functions for the chat credit gate
-- (backend-security-layer design.md decision: "single atomic conditional
-- UPDATE, not read-then-write").
--
-- SECURITY INVOKER is deliberate, not an oversight: these are only ever
-- called via the service-role client (which already bypasses RLS), so
-- SECURITY DEFINER privilege escalation is unnecessary. As a defense in
-- depth, EXECUTE is revoked from PUBLIC/authenticated below — if an
-- authenticated client somehow invoked these directly, running as INVOKER
-- means the underlying table writes would still be blocked by
-- user_credits'/credit_ledger's RLS, which has no client write policy.

-- Atomically reserve/decrement a chat credit and log the reservation.
-- Returns success = false (with the current balance) if there was not
-- enough credit to reserve, without writing a ledger row.
create or replace function public.reserve_chat_credit(
  p_user_id uuid,
  p_request_id text,
  p_cost integer
)
returns table (success boolean, new_balance integer)
language plpgsql
security invoker
as $$
declare
  v_new_balance integer;
begin
  update public.user_credits
  set credits_remaining = credits_remaining - p_cost,
      updated_at = now()
  where user_id = p_user_id
    and credits_remaining >= p_cost
  returning credits_remaining into v_new_balance;

  if v_new_balance is null then
    select credits_remaining into v_new_balance
    from public.user_credits
    where user_id = p_user_id;

    return query select false, coalesce(v_new_balance, 0);
    return;
  end if;

  insert into public.credit_ledger (user_id, amount, reason, request_id)
  values (p_user_id, p_cost, 'reservation', p_request_id);

  return query select true, v_new_balance;
end;
$$;

-- Compensating refund: restores the balance and writes a new ledger row
-- (never mutates the original reservation row) so the audit trail shows
-- both the original reservation and the refund. Idempotent/best-effort by
-- design — callers may retry safely; each call adds another refund entry
-- and another balance credit, so callers must not call this more than once
-- per failure.
create or replace function public.refund_chat_credit(
  p_user_id uuid,
  p_request_id text,
  p_amount integer,
  p_reason text default 'refund'
)
returns table (success boolean, new_balance integer)
language plpgsql
security invoker
as $$
declare
  v_new_balance integer;
begin
  update public.user_credits
  set credits_remaining = credits_remaining + p_amount,
      updated_at = now()
  where user_id = p_user_id
  returning credits_remaining into v_new_balance;

  if v_new_balance is null then
    return query select false, 0;
    return;
  end if;

  insert into public.credit_ledger (user_id, amount, reason, request_id)
  values (p_user_id, -p_amount, p_reason, p_request_id);

  return query select true, v_new_balance;
end;
$$;

revoke all on function public.reserve_chat_credit(uuid, text, integer) from public;
revoke all on function public.refund_chat_credit(uuid, text, integer, text) from public;

grant execute on function public.reserve_chat_credit(uuid, text, integer) to service_role;
grant execute on function public.refund_chat_credit(uuid, text, integer, text) to service_role;
