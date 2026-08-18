-- linkedin-pdf-storage (db-layer-data-management)
--
-- Private bucket for raw uploaded LinkedIn PDFs. Owner-scoped, path-scoped
-- INSERT only ({user_id}/...); deliberately no SELECT policy for the client
-- roles, so the only way to read an object is a signed URL generated
-- server-side with the service-role client (see
-- src/lib/supabase/linkedinPdfStorage.ts), which bypasses RLS entirely.

insert into storage.buckets (id, name, public)
values ('linkedin-pdfs', 'linkedin-pdfs', false)
on conflict (id) do nothing;

create policy "linkedin_pdfs_insert_own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'linkedin-pdfs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- No SELECT/UPDATE/DELETE policy is added for authenticated/anon roles:
-- storage.objects has RLS enabled by default, so the absence of a policy
-- means direct client reads are denied regardless of bucket privacy.
