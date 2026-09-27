begin;

-- Quota consumption and document finalization must succeed or fail together.
-- Locking the session also ensures that two previously reserved uploads cannot
-- both consume the last available slot.
create or replace function public.finalize_document_upload(
  target_session_id uuid,
  target_document_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_session public.print_sessions;
  target_document public.documents;
begin
  select * into target_document
  from public.documents
  where id = target_document_id
    and print_session_id = target_session_id
    and status = 'UPLOADING'
  for update;
  if not found then
    raise exception 'Document unavailable' using errcode = 'P0002';
  end if;

  select * into target_session
  from public.print_sessions
  where id = target_session_id
    and status = 'ACTIVE'
    and expires_at > now()
    and documents_received < max_documents
  for update;
  if not found then
    raise exception 'Upload quota unavailable' using errcode = 'P0002';
  end if;

  update public.print_sessions
  set documents_received = documents_received + 1,
      status = case when documents_received + 1 >= max_documents then 'CONSUMED' else status end
  where id = target_session.id;

  update public.documents
  set status = 'RECEIVED', received_at = now()
  where id = target_document.id;
end;
$$;

revoke all on function public.finalize_document_upload(uuid, uuid) from public, anon, authenticated;
grant execute on function public.finalize_document_upload(uuid, uuid) to service_role;

-- The non-atomic function must no longer be callable after this migration.
revoke all on function public.consume_upload_slot(uuid) from service_role;

commit;
