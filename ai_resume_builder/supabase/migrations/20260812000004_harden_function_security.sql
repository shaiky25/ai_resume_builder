-- Advisor findings after initial migration set:
-- 1. reserve_chat_credit/refund_chat_credit had mutable search_path.
-- 2. handle_new_user is SECURITY DEFINER and, lacking an explicit REVOKE,
--    is exposed to anon/authenticated as a callable RPC
--    (/rest/v1/rpc/handle_new_user) even though it's only meant to run as
--    the on_auth_user_created trigger.

alter function public.reserve_chat_credit(uuid, text, integer) set search_path = public;
alter function public.refund_chat_credit(uuid, text, integer, text) set search_path = public;

revoke all on function public.handle_new_user() from public, anon, authenticated;
