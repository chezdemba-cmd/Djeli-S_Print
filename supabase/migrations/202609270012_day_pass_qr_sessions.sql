begin;

-- The shop wants one QR code per workstation, reused by every customer for a
-- full day, instead of regenerating a single-document, single-use code for
-- each visit. Two changes make that possible:
--   1. max_documents was capped at 10 (a real DB-level blocker independent of
--      any application code); this raises it to "no practical limit" while
--      keeping the smallint column (its own ~32767 ceiling is already far
--      beyond a single shop's realistic daily walk-in volume).
--   2. a partial unique index guarantees at most one ACTIVE session per
--      workstation at any time, so there is always exactly one canonical QR.

alter table public.print_sessions drop constraint print_sessions_max_documents_check;
alter table public.print_sessions add constraint print_sessions_max_documents_check
  check (max_documents > 0);

create unique index print_sessions_one_active_per_workstation
  on public.print_sessions (workstation_id) where status = 'ACTIVE';

-- Creates (or replaces) the single active QR session for a workstation. Any
-- session still marked ACTIVE for that workstation is revoked first, in the
-- same transaction, so the unique index above is never violated and the
-- previous QR code stops working immediately: resolve_print_session already
-- filters on status = 'ACTIVE', so revoking is enough to invalidate it for
-- any customer who might still have it scanned.
create or replace function public.create_qr_session(
  target_workstation_id uuid,
  submitted_token_hash text,
  duration_seconds integer default 86400
)
returns table (session_id uuid, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_workstation public.workstations;
  new_expires_at timestamptz;
  new_id uuid;
begin
  select * into target_workstation from public.workstations where id = target_workstation_id for update;
  if not found then raise exception 'Workstation not found' using errcode = 'P0002'; end if;
  if not private.has_organization_role(target_workstation.organization_id, array['OWNER','ADMIN','OPERATOR']::public.organization_role[]) then
    raise exception 'Insufficient permission' using errcode = '42501';
  end if;
  if duration_seconds < 300 or duration_seconds > 172800 then
    raise exception 'Invalid session duration' using errcode = '22023';
  end if;
  if char_length(submitted_token_hash) < 43 then
    raise exception 'Invalid token hash' using errcode = '22023';
  end if;

  update public.print_sessions
  set status = 'REVOKED'
  where workstation_id = target_workstation_id and status = 'ACTIVE';

  new_expires_at := now() + make_interval(secs => duration_seconds);
  insert into public.print_sessions (
    organization_id, workstation_id, token_hash, expires_at, max_documents, created_by
  ) values (
    target_workstation.organization_id, target_workstation_id, submitted_token_hash,
    new_expires_at, 30000, (select auth.uid())
  ) returning id into new_id;

  return query select new_id, new_expires_at;
end;
$$;

-- Read-only: lets the operator's browser learn whether a live session already
-- exists for a workstation (e.g. created from another screen) without ever
-- exposing a token — the raw token is never persisted server-side, only its
-- hash, so there would be nothing meaningful to return here anyway.
create or replace function public.resolve_active_qr_session(target_workstation_id uuid)
returns table (
  session_id uuid,
  expires_at timestamptz,
  documents_received smallint,
  max_documents smallint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  target_workstation public.workstations;
begin
  select * into target_workstation from public.workstations where id = target_workstation_id;
  if not found then raise exception 'Workstation not found' using errcode = 'P0002'; end if;
  if not private.has_organization_role(target_workstation.organization_id, array['OWNER','ADMIN','OPERATOR']::public.organization_role[]) then
    raise exception 'Insufficient permission' using errcode = '42501';
  end if;

  return query
    select ps.id, ps.expires_at, ps.documents_received, ps.max_documents
    from public.print_sessions ps
    where ps.workstation_id = target_workstation_id
      and ps.status = 'ACTIVE'
      and ps.expires_at > now()
    limit 1;
end;
$$;

revoke all on function public.create_qr_session(uuid, text, integer) from public, anon;
grant execute on function public.create_qr_session(uuid, text, integer) to authenticated;
revoke all on function public.resolve_active_qr_session(uuid) from public, anon;
grant execute on function public.resolve_active_qr_session(uuid) to authenticated;

commit;
