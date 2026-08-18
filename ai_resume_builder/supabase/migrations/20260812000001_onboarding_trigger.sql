-- Onboarding trigger (db-layer-data-management, task 2.6)
--
-- Initializes profiles and user_credits rows the moment a new Auth user is
-- created, regardless of which provider (email/password or Google) they
-- signed up with. SECURITY DEFINER is required here (unlike the RPC
-- functions in 20260809000006) because this trigger fires before the new
-- user has a session/JWT, so it cannot rely on auth.uid() matching an RLS
-- policy — it must bypass RLS to insert the very rows that RLS will later
-- scope to that user.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, email)
  values (new.id, new.email);

  insert into public.user_credits (user_id)
  values (new.id);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
