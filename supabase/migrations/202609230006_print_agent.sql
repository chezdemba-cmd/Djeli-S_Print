begin;

alter table public.workstations
  add column if not exists agent_token_hash text,
  add column if not exists pairing_expires_at timestamptz,
  add column if not exists paired_at timestamptz;

create unique index if not exists workstations_agent_token_hash_idx
  on public.workstations(agent_token_hash) where agent_token_hash is not null;

create or replace function public.claim_next_print_job(target_workstation_id uuid)
returns table (
  job_id uuid,
  document_id uuid,
  storage_bucket text,
  storage_path text,
  mime_type text,
  printer_system_name text,
  copies integer,
  color_mode public.color_mode,
  orientation public.print_orientation,
  paper_format public.paper_format
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_job public.print_jobs;
begin
  select jobs.* into selected_job
  from public.print_jobs jobs
  join public.printers p on p.id = jobs.printer_id
  where p.workstation_id = target_workstation_id
    and jobs.status = 'WAITING_OPERATOR'
  order by jobs.created_at
  for update of jobs skip locked
  limit 1;

  if not found then return; end if;

  update public.print_jobs
  set status = 'PROCESSING', claimed_by_workstation_id = target_workstation_id, claimed_at = now()
  where id = selected_job.id;

  update public.documents set status = 'PROCESSING' where id = selected_job.document_id;
  update public.workstations set status = 'BUSY', last_seen_at = now() where id = target_workstation_id;

  return query
  select selected_job.id, d.id, d.storage_bucket, d.storage_path, d.mime_type,
    p.system_name, s.copies, s.color_mode, s.orientation, s.format
  from public.documents d
  join public.printers p on p.id = selected_job.printer_id
  join public.print_settings s on s.print_job_id = selected_job.id
  where d.id = selected_job.document_id;
end;
$$;

create or replace function public.report_print_job_status(
  target_workstation_id uuid,
  target_job_id uuid,
  target_status public.document_status,
  target_failure_code text default null,
  target_failure_message text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_job public.print_jobs;
begin
  if target_status not in ('PRINTING', 'PRINTED', 'FAILED') then
    raise exception 'Unsupported agent status' using errcode = '22023';
  end if;

  select * into target_job from public.print_jobs
  where id = target_job_id and claimed_by_workstation_id = target_workstation_id
  for update;
  if not found then raise exception 'Job not claimed by workstation' using errcode = '42501'; end if;

  update public.print_jobs set
    status = target_status,
    started_at = case when target_status = 'PRINTING' then coalesce(started_at, now()) else started_at end,
    printed_at = case when target_status = 'PRINTED' then now() else printed_at end,
    failed_at = case when target_status = 'FAILED' then now() else failed_at end,
    failure_code = case when target_status = 'FAILED' then left(target_failure_code, 120) else null end,
    failure_message = case when target_status = 'FAILED' then left(target_failure_message, 1000) else null end
  where id = target_job_id;

  update public.documents set
    status = target_status,
    error_code = case when target_status = 'FAILED' then left(target_failure_code, 120) else null end,
    error_message = case when target_status = 'FAILED' then left(target_failure_message, 1000) else null end
  where id = target_job.document_id;

  if target_status in ('PRINTED', 'FAILED') then
    update public.workstations set status = 'ONLINE', last_seen_at = now() where id = target_workstation_id;
  end if;
end;
$$;

revoke all on function public.claim_next_print_job(uuid) from public, anon, authenticated;
revoke all on function public.report_print_job_status(uuid, uuid, public.document_status, text, text) from public, anon, authenticated;
grant execute on function public.claim_next_print_job(uuid) to service_role;
grant execute on function public.report_print_job_status(uuid, uuid, public.document_status, text, text) to service_role;

commit;
