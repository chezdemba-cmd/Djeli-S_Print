begin;

create or replace function private.queue_document_deletion_after_print()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'PRINTED' and old.status is distinct from 'PRINTED' then
    insert into public.deletion_requests (organization_id, document_id, storage_bucket, storage_path)
    values (new.organization_id, new.id, new.storage_bucket, new.storage_path)
    on conflict (document_id) do update set
      status = 'PENDING', available_at = now(), last_error = null;
  end if;
  return new;
end;
$$;

create trigger documents_queue_deletion_after_print
  after update of status on public.documents
  for each row execute function private.queue_document_deletion_after_print();

create or replace function public.claim_document_deletions(batch_size integer default 50)
returns table (request_id uuid, document_id uuid, storage_bucket text, storage_path text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if batch_size < 1 or batch_size > 100 then
    raise exception 'batch_size must be between 1 and 100' using errcode = '22023';
  end if;

  perform public.enqueue_expired_documents(batch_size);

  update public.deletion_requests
  set status = 'FAILED', available_at = now(), locked_at = null, last_error = 'Worker lease expired'
  where status = 'PROCESSING' and locked_at < now() - interval '10 minutes';

  return query
  with candidates as (
    select deletion.id
    from public.deletion_requests deletion
    where deletion.status in ('PENDING', 'FAILED')
      and deletion.available_at <= now()
      and deletion.attempts < 10
    order by deletion.available_at, deletion.created_at
    for update skip locked
    limit batch_size
  ), claimed as (
    update public.deletion_requests deletion
    set status = 'PROCESSING', locked_at = now(), attempts = deletion.attempts + 1, last_error = null
    from candidates
    where deletion.id = candidates.id
    returning deletion.id, deletion.document_id, deletion.storage_bucket, deletion.storage_path
  )
  select claimed.id, claimed.document_id, claimed.storage_bucket, claimed.storage_path from claimed;
end;
$$;

create or replace function public.complete_document_deletion(
  target_request_id uuid,
  succeeded boolean,
  failure_message text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_request public.deletion_requests;
begin
  select * into target_request from public.deletion_requests
  where id = target_request_id and status = 'PROCESSING'
  for update;
  if not found then raise exception 'Deletion request is not processing' using errcode = '55000'; end if;

  if succeeded then
    update public.deletion_requests
    set status = 'COMPLETED', completed_at = now(), locked_at = null, last_error = null
    where id = target_request_id;

    update public.documents
    set status = 'DELETED', deleted_at = now(), original_filename = '[deleted]',
      display_name = '[deleted]', sha256 = null, preflight_data = '{}'::jsonb,
      error_code = null, error_message = null
    where id = target_request.document_id and status in ('PRINTED', 'EXPIRED', 'FAILED');

    insert into public.audit_logs (organization_id, action, entity_type, entity_id, metadata)
    values (target_request.organization_id, 'document.deleted', 'document', target_request.document_id,
      jsonb_build_object('request_id', target_request.id, 'attempts', target_request.attempts));
  else
    update public.deletion_requests
    set status = 'FAILED', locked_at = null, last_error = left(coalesce(failure_message, 'Unknown storage error'), 1000),
      available_at = now() + power(2, least(attempts, 10)) * interval '1 minute'
    where id = target_request_id;
  end if;
end;
$$;

revoke all on function public.claim_document_deletions(integer) from public, anon, authenticated;
revoke all on function public.complete_document_deletion(uuid, boolean, text) from public, anon, authenticated;
grant execute on function public.claim_document_deletions(integer) to service_role;
grant execute on function public.complete_document_deletion(uuid, boolean, text) to service_role;

commit;
