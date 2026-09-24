begin;

create table private.api_rate_limits (
  scope text not null,
  key_hash text not null,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 1 check (request_count > 0),
  primary key (scope, key_hash)
);
revoke all on private.api_rate_limits from public, anon, authenticated;

create or replace function public.consume_api_rate_limit(
  target_scope text,
  target_key_hash text,
  maximum_requests integer,
  window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare current_count integer;
begin
  if char_length(target_scope) not between 1 and 80
    or char_length(target_key_hash) not between 32 and 128
    or maximum_requests not between 1 and 10000
    or window_seconds not between 1 and 86400 then
    raise exception 'Invalid rate limit parameters' using errcode = '22023';
  end if;

  insert into private.api_rate_limits (scope, key_hash, window_started_at, request_count)
  values (target_scope, target_key_hash, now(), 1)
  on conflict (scope, key_hash) do update set
    window_started_at = case
      when private.api_rate_limits.window_started_at <= now() - make_interval(secs => window_seconds) then now()
      else private.api_rate_limits.window_started_at end,
    request_count = case
      when private.api_rate_limits.window_started_at <= now() - make_interval(secs => window_seconds) then 1
      else private.api_rate_limits.request_count + 1 end
  returning request_count into current_count;

  return current_count <= maximum_requests;
end;
$$;

create or replace function public.maintain_print_agent_health()
returns table (offline_workstations integer, failed_jobs integer)
language plpgsql
security definer
set search_path = ''
as $$
declare offline_count integer; failed_count integer;
begin
  update public.workstations
  set status = 'OFFLINE'
  where status <> 'OFFLINE'
    and (last_seen_at is null or last_seen_at < now() - interval '1 minute');
  get diagnostics offline_count = row_count;

  with stale as (
    update public.print_jobs
    set status = 'FAILED', failed_at = now(), failure_code = 'AGENT_TIMEOUT',
      failure_message = 'Le Print Agent ne répond plus.'
    where (status = 'PROCESSING' and updated_at < now() - interval '10 minutes')
       or (status = 'PRINTING' and updated_at < now() - interval '2 hours')
    returning document_id
  ), failed_documents as (
    update public.documents document
    set status = 'FAILED', error_code = 'AGENT_TIMEOUT', error_message = 'Le Print Agent ne répond plus.'
    from stale where document.id = stale.document_id
    returning document.id
  )
  select count(*)::integer into failed_count from failed_documents;

  delete from private.api_rate_limits
  where window_started_at < now() - interval '1 day';

  return query select offline_count, failed_count;
end;
$$;

revoke all on function public.consume_api_rate_limit(text, text, integer, integer) from public, anon, authenticated;
revoke all on function public.maintain_print_agent_health() from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(text, text, integer, integer) to service_role;
grant execute on function public.maintain_print_agent_health() to service_role;

commit;
