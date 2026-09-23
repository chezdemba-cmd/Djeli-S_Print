begin;

create or replace function public.create_print_job(
  target_document_id uuid,
  target_printer_id uuid,
  requested_format public.paper_format,
  requested_orientation public.print_orientation,
  requested_color_mode public.color_mode,
  requested_copies integer
)
returns table (job_id uuid, reference_number bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_document public.documents;
  target_printer public.printers;
  capabilities public.printer_capabilities;
  new_job public.print_jobs;
  caller_id uuid := (select auth.uid());
begin
  if caller_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if requested_format = 'CUSTOM' then raise exception 'Custom format is not available in MVP' using errcode = '22023'; end if;
  if requested_copies < 1 or requested_copies > 999 then raise exception 'Invalid copies' using errcode = '22023'; end if;

  select * into target_document from public.documents where id = target_document_id for update;
  if not found or target_document.status <> 'READY' then raise exception 'Document is not ready' using errcode = '55000'; end if;
  if not private.has_organization_role(target_document.organization_id, array['OWNER','ADMIN','OPERATOR']::public.organization_role[]) then
    raise exception 'Insufficient permission' using errcode = '42501';
  end if;

  select * into target_printer from public.printers
  where id = target_printer_id and organization_id = target_document.organization_id and is_enabled;
  if not found then raise exception 'Printer unavailable' using errcode = '22023'; end if;
  select * into capabilities from public.printer_capabilities where printer_id = target_printer.id;
  if not found then raise exception 'Printer capabilities unavailable' using errcode = '22023'; end if;
  if not requested_format = any(capabilities.formats) then raise exception 'Unsupported paper format' using errcode = '22023'; end if;
  if requested_color_mode = 'COLOR' and not capabilities.supports_color then raise exception 'Color unavailable' using errcode = '22023'; end if;

  insert into public.print_jobs (organization_id, document_id, printer_id, status, created_by)
  values (target_document.organization_id, target_document.id, target_printer.id, 'WAITING_OPERATOR', caller_id)
  returning * into new_job;

  insert into public.print_settings (
    print_job_id, organization_id, format, orientation, color_mode, duplex, copies, scale_mode
  ) values (
    new_job.id, target_document.organization_id, requested_format, requested_orientation,
    requested_color_mode, 'SIMPLEX', requested_copies, 'FIT'
  );

  update public.documents set status = 'WAITING_OPERATOR' where id = target_document.id;
  insert into public.audit_logs (organization_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (
    target_document.organization_id, caller_id, 'print_job.created', 'print_job', new_job.id,
    jsonb_build_object('document_id', target_document.id, 'printer_id', target_printer.id)
  );

  return query select new_job.id, new_job.reference_number;
end;
$$;

revoke insert, update on public.print_jobs, public.print_settings from authenticated;
revoke all on function public.create_print_job(uuid, uuid, public.paper_format, public.print_orientation, public.color_mode, integer) from public, anon;
grant execute on function public.create_print_job(uuid, uuid, public.paper_format, public.print_orientation, public.color_mode, integer) to authenticated;

commit;
