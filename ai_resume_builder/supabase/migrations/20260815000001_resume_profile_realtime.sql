-- resume-profile-realtime (close-integration-gaps, tasks 3.1/4.1)
--
-- Adds app.resumes and app.profiles to the supabase_realtime publication so
-- the live preview and premium-download gate can subscribe to
-- postgres_changes on the authenticated user's own rows, matching the
-- pattern already established for app.user_credits and
-- app.payment_transactions. Realtime enforces the same RLS policies as
-- direct reads (owner-only SELECT on both tables), so no separate
-- authorization layer is needed.

alter publication supabase_realtime add table app.resumes;
alter publication supabase_realtime add table app.profiles;
