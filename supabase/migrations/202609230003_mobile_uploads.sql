begin;

create or replace function public.reserve_document_upload(
  submitted_token_hash text,
  submitted_filename text,
  submitted_mime_type text,
  submitted_size_bytes bigint
)
returns table (document_id uuid, storage_path text, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_session public.print_sessions;
  target_organization public.organizations;
  new_document_id uuid := gen_random_uuid();
  extension text;
  object_path text;
  document_expiration timestamptz;
begin
  select ps.* into target_session
  from public.print_sessions ps
  where ps.token_hash = submitted_token_hash
    and ps.status = 'ACTIVE'
    and ps.expires_at > now()
    and ps.documents_received < ps.max_documents
  for update;

  if not found then raise exception 'Session unavailable' using errcode = 'P0002'; end if;
  select * into strict target_organization from public.organizations where id = target_session.organization_id;

  if submitted_mime_type not in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp') then
    raise exception 'Unsupported MIME type' using errcode = '22023';
  end if;
  if submitted_size_bytes < 1 or submitted_size_bytes > target_organization.max_upload_bytes then
    raise exception 'Invalid upload size' using errcode = '22023';
  end if;
  if char_length(submitted_filename) < 1 or char_length(submitted_filename) > 255 then
    raise exception 'Invalid filename' using errcode = '22023';
  end if;

  extension := case submitted_mime_type
    when 'application/pdf' then 'pdf' when 'image/jpeg' then 'jpg'
    when 'image/png' then 'png' when 'image/webp' then 'webp'
  end;
  object_path := target_session.organization_id::text || '/' || new_document_id::text || '/original.' || extension;
  document_expiration := now() + make_interval(mins => target_organization.document_ttl_minutes);

  insert into public.documents (
    id, organization_id, print_session_id, storage_path, original_filename, display_name,
    mime_type, size_bytes, status, expires_at
  ) values (
    new_document_id, target_session.organization_id, target_session.id, object_path,
    submitted_filename, submitted_filename, submitted_mime_type, submitted_size_bytes,
    'UPLOADING', document_expiration
  );

  update public.print_sessions
  set documents_received = documents_received + 1,
      status = case when documents_received + 1 >= max_documents then 'CONSUMED' else status end
  where id = target_session.id;

  return query select new_document_id, object_path, document_expiration;
end;
$$;

revoke all on function public.reserve_document_upload(text, text, text, bigint) from public, anon, authenticated;
grant execute on function public.reserve_document_upload(text, text, text, bigint) to service_role;

commit;
