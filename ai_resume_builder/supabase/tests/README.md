# db-layer integration tests

Exercises real RLS policies, Storage policies, and Realtime scoping against
a live Supabase project (tasks 3.5, 3.9, 3.10, 5.2, 6.1–6.4 in
`openspec/changes/db-layer-data-management/tasks.md`). Not run by `npm test`
or CI — these hit the network and create/delete real Auth users.

## Run

Point at a **disposable** Supabase project (all migrations in
`supabase/migrations/` applied), then:

```bash
SUPABASE_URL=... \
SUPABASE_ANON_KEY=... \
SUPABASE_SERVICE_ROLE_KEY=... \
npm run test:integration
```

Without these three env vars set, every suite here is skipped (not failed).
