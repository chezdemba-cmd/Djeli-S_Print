begin;

create or replace function public.resolve_print_session(submitted_token_hash text)
returns table (
  session_id uuid,
  organization_id uuid,
  organization_name text,
  workstation_id uuid,
  workstation_name text,
  expires_at timestamptz,
  remaining_documents integer,
  max_upload_bytes bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    ps.id,
    ps.organization_id,
    o.name,
    ps.workstation_id,
    w.name,
    ps.expires_at,
    (ps.max_documents - ps.documents_received)::integer,
    o.max_upload_bytes
  from public.print_sessions ps
  join public.organizations o on o.id = ps.organization_id
  join public.workstations w on w.id = ps.workstation_id
  where ps.token_hash = submitted_token_hash
    and ps.status = 'ACTIVE'
    and ps.expires_at > now()
    and ps.documents_received < ps.max_documents
  limit 1;
$$;

comment on function public.resolve_print_session(text) is
  'Resolves an opaque QR token hash to the minimum public session metadata. Never accepts a raw token.';

revoke all on function public.resolve_print_session(text) from public;
grant execute on function public.resolve_print_session(text) to anon, authenticated;

commit;
