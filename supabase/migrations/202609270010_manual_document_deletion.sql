begin;

-- Lets an operator force a document out of the print queue immediately
-- (the README promises a "×" delete action on each document card, which the
-- app never implemented). Forcing expires_at into the past is enough:
-- enqueue_expired_documents() already sweeps any non-terminal, non-printing
-- document whose expires_at has passed, so this reuses the existing,
-- already-tested deletion pipeline instead of adding a new one. It never
-- touches `status`, so it never collides with enforce_status_transition().
create or replace function public.request_document_deletion(target_document_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_document public.documents;
begin
  select * into target_document from public.documents where id = target_document_id for update;
  if not found then raise exception 'Document not found' using errcode = 'P0002'; end if;
  if not private.has_organization_role(target_document.organization_id, array['OWNER','ADMIN','OPERATOR']::public.organization_role[]) then
    raise exception 'Insufficient permission' using errcode = '42501';
  end if;
  if target_document.status in ('PRINTING', 'PRINTED', 'DELETED') then
    raise exception 'Document cannot be deleted in its current state' using errcode = '55000';
  end if;

  -- clock_timestamp(), not now(): now() is frozen at transaction start, so a
  -- caller whose transaction also created the document (as pgTAP's tests do)
  -- would produce expires_at = created_at and trip the expires_at > created_at
  -- check. clock_timestamp() always reflects real elapsed time between the two
  -- statements.
  update public.documents set expires_at = clock_timestamp() where id = target_document_id;
end;
$$;

revoke all on function public.request_document_deletion(uuid) from public, anon;
grant execute on function public.request_document_deletion(uuid) to authenticated;

commit;
