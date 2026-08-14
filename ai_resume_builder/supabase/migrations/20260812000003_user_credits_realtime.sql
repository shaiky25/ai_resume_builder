-- user-credits-realtime (db-layer-data-management, task 5.1)
--
-- Adds user_credits to the supabase_realtime publication so the frontend
-- can subscribe to postgres_changes on its own row and see balance updates
-- the moment /api/chat decrements them, without polling. Realtime enforces
-- the same RLS policies as direct reads on this table (owner-only SELECT,
-- no client write policy), so no separate authorization layer is needed.

alter publication supabase_realtime add table public.user_credits;
