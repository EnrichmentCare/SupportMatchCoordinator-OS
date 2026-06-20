-- =============================================================================
-- Coordinator OS — Migration 0003
-- Private Storage bucket for participant documents, scoped by org via path.
-- Object path convention: <org_id>/<participant_id>/<filename>
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- Org members may read/write objects whose first path segment is one of their orgs.
create policy "documents_read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'documents'
    and ((storage.foldername(name))[1])::uuid in (select public.auth_org_ids())
  );

create policy "documents_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'documents'
    and ((storage.foldername(name))[1])::uuid in (select public.auth_org_ids())
  );

create policy "documents_update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'documents'
    and ((storage.foldername(name))[1])::uuid in (select public.auth_org_ids())
  );

create policy "documents_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'documents'
    and ((storage.foldername(name))[1])::uuid in (select public.auth_org_ids())
  );
