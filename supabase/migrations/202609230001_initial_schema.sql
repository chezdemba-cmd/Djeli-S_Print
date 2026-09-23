begin;

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create type public.organization_role as enum ('OWNER', 'ADMIN', 'OPERATOR', 'VIEWER');
create type public.workstation_status as enum ('ONLINE', 'OFFLINE', 'BUSY');
create type public.document_status as enum (
  'CREATED', 'UPLOADING', 'RECEIVED', 'ANALYZING', 'READY', 'WAITING_OPERATOR',
  'PROCESSING', 'PRINTING', 'PRINTED', 'FAILED', 'EXPIRED', 'DELETED'
);
create type public.color_mode as enum ('COLOR', 'BLACK_AND_WHITE', 'GRAYSCALE');
create type public.print_orientation as enum ('PORTRAIT', 'LANDSCAPE');
create type public.paper_format as enum ('A4', 'A3', 'A2', 'A1', 'A0', 'CUSTOM');
create type public.duplex_mode as enum ('SIMPLEX', 'DUPLEX_LONG_EDGE', 'DUPLEX_SHORT_EDGE');
create type public.scale_mode as enum ('ACTUAL_SIZE', 'FIT', 'CROP', 'CUSTOM');
create type public.session_status as enum ('ACTIVE', 'CONSUMED', 'EXPIRED', 'REVOKED');
create type public.preflight_rating as enum ('EXCELLENT', 'GOOD', 'ACCEPTABLE', 'LOW', 'NOT_RECOMMENDED');
create type public.deletion_status as enum ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  document_ttl_minutes integer not null default 20 check (document_ttl_minutes between 5 and 1440),
  max_upload_bytes bigint not null default 83886080 check (max_upload_bytes between 1048576 and 1073741824),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) between 1 and 120),
  locale text not null default 'fr' check (locale in ('fr', 'en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.organization_role not null default 'OPERATOR',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table public.workstations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  agent_identifier text unique,
  pairing_secret_hash text,
  status public.workstation_status not null default 'OFFLINE',
  last_seen_at timestamptz,
  auto_start boolean not null default false,
  agent_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, name)
);

create table public.printers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  workstation_id uuid not null,
  system_name text not null,
  display_name text not null check (char_length(display_name) between 1 and 160),
  driver_name text,
  is_default boolean not null default false,
  is_enabled boolean not null default true,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (workstation_id, system_name),
  foreign key (workstation_id, organization_id)
    references public.workstations(id, organization_id) on delete cascade
);

create table public.materials (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  code text not null check (code ~ '^[A-Z0-9][A-Z0-9_-]*$'),
  description text,
  min_grammage_gsm integer check (min_grammage_gsm is null or min_grammage_gsm > 0),
  max_grammage_gsm integer check (
    max_grammage_gsm is null or
    (max_grammage_gsm > 0 and (min_grammage_gsm is null or max_grammage_gsm >= min_grammage_gsm))
  ),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, code)
);

create table public.finishes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  code text not null check (code ~ '^[A-Z0-9][A-Z0-9_-]*$'),
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, code)
);

create table public.printer_capabilities (
  printer_id uuid primary key references public.printers(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  formats public.paper_format[] not null default '{}',
  supports_color boolean not null default false,
  supports_duplex boolean not null default false,
  max_dpi integer check (max_dpi is null or max_dpi between 72 and 9600),
  max_width_mm numeric(10,2) check (max_width_mm is null or max_width_mm > 0),
  max_height_mm numeric(10,2) check (max_height_mm is null or max_height_mm > 0),
  borderless boolean not null default false,
  raw_capabilities jsonb not null default '{}'::jsonb check (jsonb_typeof(raw_capabilities) = 'object'),
  captured_at timestamptz not null default now(),
  unique (printer_id, organization_id),
  foreign key (printer_id, organization_id)
    references public.printers(id, organization_id) on delete cascade
);

create table public.printer_materials (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  printer_id uuid not null,
  material_id uuid not null,
  primary key (printer_id, material_id),
  foreign key (printer_id, organization_id)
    references public.printers(id, organization_id) on delete cascade,
  foreign key (material_id, organization_id)
    references public.materials(id, organization_id) on delete cascade
);

create table public.print_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  workstation_id uuid not null,
  token_hash text not null unique check (char_length(token_hash) >= 43),
  status public.session_status not null default 'ACTIVE',
  expires_at timestamptz not null,
  max_documents smallint not null default 1 check (max_documents between 1 and 10),
  documents_received smallint not null default 0 check (documents_received >= 0),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  check (expires_at > created_at),
  check (documents_received <= max_documents),
  foreign key (workstation_id, organization_id)
    references public.workstations(id, organization_id) on delete cascade
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  print_session_id uuid not null,
  storage_bucket text not null default 'documents' check (storage_bucket = 'documents'),
  storage_path text not null unique,
  original_filename text not null check (char_length(original_filename) between 1 and 255),
  display_name text not null check (char_length(display_name) between 1 and 255),
  mime_type text not null check (mime_type in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')),
  size_bytes bigint not null check (size_bytes > 0),
  sha256 text check (sha256 is null or sha256 ~ '^[a-f0-9]{64}$'),
  status public.document_status not null default 'CREATED',
  page_count integer check (page_count is null or page_count > 0),
  width_px integer check (width_px is null or width_px > 0),
  height_px integer check (height_px is null or height_px > 0),
  width_mm numeric(10,2) check (width_mm is null or width_mm > 0),
  height_mm numeric(10,2) check (height_mm is null or height_mm > 0),
  source_dpi numeric(8,2) check (source_dpi is null or source_dpi > 0),
  preflight_rating public.preflight_rating,
  preflight_data jsonb not null default '{}'::jsonb check (jsonb_typeof(preflight_data) = 'object'),
  error_code text,
  error_message text,
  expires_at timestamptz not null,
  received_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  check (expires_at > created_at),
  check (storage_path like organization_id::text || '/%'),
  check ((status = 'DELETED' and deleted_at is not null) or status <> 'DELETED'),
  foreign key (print_session_id, organization_id)
    references public.print_sessions(id, organization_id) on delete restrict
);

create table public.print_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  document_id uuid not null,
  printer_id uuid,
  status public.document_status not null default 'WAITING_OPERATOR',
  reference_number bigint generated always as identity,
  claimed_by_workstation_id uuid,
  claimed_at timestamptz,
  started_at timestamptz,
  printed_at timestamptz,
  failed_at timestamptz,
  failure_code text,
  failure_message text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (reference_number),
  foreign key (document_id, organization_id)
    references public.documents(id, organization_id) on delete restrict,
  foreign key (printer_id, organization_id)
    references public.printers(id, organization_id) on delete restrict,
  foreign key (claimed_by_workstation_id, organization_id)
    references public.workstations(id, organization_id) on delete restrict
);

create unique index print_jobs_one_active_per_document
  on public.print_jobs(document_id)
  where status in ('WAITING_OPERATOR', 'PROCESSING', 'PRINTING');

create table public.print_settings (
  print_job_id uuid primary key references public.print_jobs(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  format public.paper_format not null default 'A4',
  custom_width_mm numeric(10,2),
  custom_height_mm numeric(10,2),
  orientation public.print_orientation not null default 'PORTRAIT',
  color_mode public.color_mode not null default 'COLOR',
  duplex public.duplex_mode not null default 'SIMPLEX',
  copies integer not null default 1 check (copies between 1 and 999),
  page_ranges text,
  scale_mode public.scale_mode not null default 'FIT',
  scale_percent numeric(6,2) check (scale_percent is null or scale_percent between 1 and 1000),
  margin_mm numeric(8,2) not null default 0 check (margin_mm >= 0),
  borderless boolean not null default false,
  dpi integer check (dpi is null or dpi between 72 and 9600),
  material_id uuid,
  grammage_gsm integer check (grammage_gsm is null or grammage_gsm > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (format = 'CUSTOM' and custom_width_mm > 0 and custom_height_mm > 0) or
    (format <> 'CUSTOM' and custom_width_mm is null and custom_height_mm is null)
  ),
  foreign key (print_job_id, organization_id)
    references public.print_jobs(id, organization_id) on delete cascade,
  foreign key (material_id, organization_id)
    references public.materials(id, organization_id) on delete restrict
);

create table public.print_job_finishes (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  print_job_id uuid not null,
  finish_id uuid not null,
  quantity integer not null default 1 check (quantity > 0),
  primary key (print_job_id, finish_id),
  foreign key (print_job_id, organization_id)
    references public.print_jobs(id, organization_id) on delete cascade,
  foreign key (finish_id, organization_id)
    references public.finishes(id, organization_id) on delete restrict
);

create table public.pricing_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  priority integer not null default 100,
  conditions jsonb not null default '{}'::jsonb check (jsonb_typeof(conditions) = 'object'),
  price_cents integer not null check (price_cents >= 0),
  unit text not null check (unit in ('PAGE', 'COPY', 'SQUARE_METER', 'JOB', 'ITEM')),
  currency char(3) not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  is_active boolean not null default true,
  valid_from timestamptz,
  valid_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (valid_until is null or valid_from is null or valid_until > valid_from)
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  -- Deliberately not foreign keys: audit evidence must survive deletion of source records.
  organization_id uuid,
  actor_user_id uuid,
  actor_workstation_id uuid,
  action text not null check (char_length(action) between 3 and 120),
  entity_type text not null check (char_length(entity_type) between 1 and 80),
  entity_id uuid,
  correlation_id uuid not null default gen_random_uuid(),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  ip_hash text,
  created_at timestamptz not null default now(),
  check (actor_user_id is null or actor_workstation_id is null)
);

create table public.deletion_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  document_id uuid not null,
  storage_bucket text not null,
  storage_path text not null,
  status public.deletion_status not null default 'PENDING',
  attempts smallint not null default 0 check (attempts between 0 and 20),
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  completed_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (document_id),
  foreign key (document_id, organization_id)
    references public.documents(id, organization_id) on delete cascade
);

create index organization_members_user_idx on public.organization_members(user_id, organization_id);
create index workstations_org_status_idx on public.workstations(organization_id, status);
create index printers_org_workstation_idx on public.printers(organization_id, workstation_id);
create index print_sessions_active_idx on public.print_sessions(organization_id, workstation_id, expires_at)
  where status = 'ACTIVE';
create index documents_org_status_created_idx on public.documents(organization_id, status, created_at desc);
create index documents_expiration_idx on public.documents(expires_at)
  where status not in ('DELETED', 'EXPIRED');
create index print_jobs_org_status_created_idx on public.print_jobs(organization_id, status, created_at desc);
create index audit_logs_org_created_idx on public.audit_logs(organization_id, created_at desc);
create index deletion_requests_ready_idx on public.deletion_requests(status, available_at)
  where status in ('PENDING', 'FAILED');
create index pricing_rules_active_idx on public.pricing_rules(organization_id, priority, valid_from, valid_until)
  where is_active;

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function private.current_organization_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select om.organization_id
  from public.organization_members om
  where om.user_id = (select auth.uid());
$$;

create or replace function private.is_organization_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = target_organization_id
      and om.user_id = (select auth.uid())
  );
$$;

create or replace function private.has_organization_role(
  target_organization_id uuid,
  allowed_roles public.organization_role[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = target_organization_id
      and om.user_id = (select auth.uid())
      and om.role = any(allowed_roles)
  );
$$;

revoke all on function private.current_organization_ids() from public;
revoke all on function private.is_organization_member(uuid) from public;
revoke all on function private.has_organization_role(uuid, public.organization_role[]) from public;
grant execute on function private.current_organization_ids() to authenticated;
grant execute on function private.is_organization_member(uuid) to authenticated;
grant execute on function private.has_organization_role(uuid, public.organization_role[]) to authenticated;

create or replace function private.enforce_status_transition()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = old.status then
    return new;
  end if;

  if not (
    (old.status = 'CREATED' and new.status in ('UPLOADING', 'FAILED', 'EXPIRED')) or
    (old.status = 'UPLOADING' and new.status in ('RECEIVED', 'FAILED', 'EXPIRED')) or
    (old.status = 'RECEIVED' and new.status in ('ANALYZING', 'FAILED', 'EXPIRED')) or
    (old.status = 'ANALYZING' and new.status in ('READY', 'FAILED', 'EXPIRED')) or
    (old.status = 'READY' and new.status in ('WAITING_OPERATOR', 'PROCESSING', 'FAILED', 'EXPIRED')) or
    (old.status = 'WAITING_OPERATOR' and new.status in ('PROCESSING', 'FAILED', 'EXPIRED')) or
    (old.status = 'PROCESSING' and new.status in ('PRINTING', 'FAILED', 'EXPIRED')) or
    (old.status = 'PRINTING' and new.status in ('PRINTED', 'FAILED')) or
    (old.status = 'PRINTED' and new.status = 'DELETED') or
    (old.status = 'FAILED' and new.status in ('PROCESSING', 'EXPIRED', 'DELETED')) or
    (old.status = 'EXPIRED' and new.status = 'DELETED')
  ) then
    raise exception 'Invalid status transition: % -> %', old.status, new.status
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create or replace function private.prevent_audit_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Audit logs are immutable' using errcode = '42501';
end;
$$;

create or replace function private.protect_last_organization_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.role = 'OWNER' and (
    tg_op = 'DELETE'
    or new.role <> 'OWNER'
    or new.organization_id <> old.organization_id
    or new.user_id <> old.user_id
  ) then
    if not exists (
      select 1
      from public.organization_members om
      where om.organization_id = old.organization_id
        and om.user_id <> old.user_id
        and om.role = 'OWNER'
    ) then
      raise exception 'An organization must retain at least one owner' using errcode = '23514';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger organizations_touch_updated_at before update on public.organizations
  for each row execute function private.touch_updated_at();
create trigger profiles_touch_updated_at before update on public.profiles
  for each row execute function private.touch_updated_at();
create trigger workstations_touch_updated_at before update on public.workstations
  for each row execute function private.touch_updated_at();
create trigger printers_touch_updated_at before update on public.printers
  for each row execute function private.touch_updated_at();
create trigger materials_touch_updated_at before update on public.materials
  for each row execute function private.touch_updated_at();
create trigger finishes_touch_updated_at before update on public.finishes
  for each row execute function private.touch_updated_at();
create trigger print_sessions_touch_updated_at before update on public.print_sessions
  for each row execute function private.touch_updated_at();
create trigger documents_touch_updated_at before update on public.documents
  for each row execute function private.touch_updated_at();
create trigger print_jobs_touch_updated_at before update on public.print_jobs
  for each row execute function private.touch_updated_at();
create trigger print_settings_touch_updated_at before update on public.print_settings
  for each row execute function private.touch_updated_at();
create trigger pricing_rules_touch_updated_at before update on public.pricing_rules
  for each row execute function private.touch_updated_at();
create trigger deletion_requests_touch_updated_at before update on public.deletion_requests
  for each row execute function private.touch_updated_at();
create trigger documents_enforce_status before update of status on public.documents
  for each row execute function private.enforce_status_transition();
create trigger print_jobs_enforce_status before update of status on public.print_jobs
  for each row execute function private.enforce_status_transition();
create trigger audit_logs_immutable before update or delete on public.audit_logs
  for each row execute function private.prevent_audit_mutation();
create trigger organization_members_protect_last_owner
  before update of role, organization_id, user_id or delete on public.organization_members
  for each row execute function private.protect_last_organization_owner();
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_auth_user();

create or replace function public.create_organization(organization_name text, organization_slug text)
returns public.organizations
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_organization public.organizations;
  caller_id uuid := (select auth.uid());
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  insert into public.profiles (id) values (caller_id)
  on conflict (id) do nothing;

  insert into public.organizations (name, slug)
  values (trim(organization_name), lower(trim(organization_slug)))
  returning * into created_organization;

  insert into public.organization_members (organization_id, user_id, role)
  values (created_organization.id, caller_id, 'OWNER');

  insert into public.audit_logs (organization_id, actor_user_id, action, entity_type, entity_id)
  values (created_organization.id, caller_id, 'organization.created', 'organization', created_organization.id);

  return created_organization;
end;
$$;

revoke all on function public.create_organization(text, text) from public, anon;
grant execute on function public.create_organization(text, text) to authenticated;

create or replace function public.enqueue_expired_documents(batch_size integer default 100)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  queued_count integer;
begin
  if batch_size < 1 or batch_size > 1000 then
    raise exception 'batch_size must be between 1 and 1000' using errcode = '22023';
  end if;

  with candidates as (
    select d.id, d.organization_id, d.storage_bucket, d.storage_path
    from public.documents d
    where d.expires_at <= now()
      and d.status in (
        'CREATED', 'UPLOADING', 'RECEIVED', 'ANALYZING',
        'READY', 'WAITING_OPERATOR', 'PROCESSING', 'FAILED'
      )
    order by d.expires_at
    for update skip locked
    limit batch_size
  ), expired as (
    update public.documents d
    set status = 'EXPIRED'
    from candidates c
    where d.id = c.id
    returning d.id, d.organization_id, d.storage_bucket, d.storage_path
  )
  insert into public.deletion_requests (
    organization_id, document_id, storage_bucket, storage_path
  )
  select organization_id, id, storage_bucket, storage_path from expired
  on conflict (document_id) do nothing;

  get diagnostics queued_count = row_count;
  return queued_count;
end;
$$;

revoke all on function public.enqueue_expired_documents(integer) from public, anon, authenticated;
grant execute on function public.enqueue_expired_documents(integer) to service_role;

-- RLS is enabled on every table exposed through the public schema.
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_members enable row level security;
alter table public.workstations enable row level security;
alter table public.printers enable row level security;
alter table public.printer_capabilities enable row level security;
alter table public.printer_materials enable row level security;
alter table public.print_sessions enable row level security;
alter table public.documents enable row level security;
alter table public.print_jobs enable row level security;
alter table public.print_settings enable row level security;
alter table public.materials enable row level security;
alter table public.finishes enable row level security;
alter table public.print_job_finishes enable row level security;
alter table public.pricing_rules enable row level security;
alter table public.audit_logs enable row level security;
alter table public.deletion_requests enable row level security;

revoke all on public.organizations, public.profiles, public.organization_members,
  public.workstations, public.printers, public.printer_capabilities, public.printer_materials,
  public.print_sessions, public.documents, public.print_jobs, public.print_settings,
  public.materials, public.finishes, public.print_job_finishes, public.pricing_rules,
  public.audit_logs, public.deletion_requests from anon, authenticated;
grant select on public.organizations, public.profiles, public.organization_members,
  public.workstations, public.printers, public.printer_capabilities, public.printer_materials,
  public.print_sessions, public.documents, public.print_jobs, public.print_settings,
  public.materials, public.finishes, public.print_job_finishes, public.pricing_rules,
  public.audit_logs to authenticated;
grant insert, update on public.workstations, public.printers, public.printer_capabilities,
  public.printer_materials, public.print_sessions, public.documents, public.print_jobs,
  public.print_settings, public.materials, public.finishes, public.print_job_finishes,
  public.pricing_rules to authenticated;
grant update on public.organizations, public.profiles, public.organization_members to authenticated;
grant insert, delete on public.organization_members to authenticated;
grant delete on public.workstations, public.printers, public.printer_materials,
  public.materials, public.finishes, public.print_job_finishes, public.pricing_rules to authenticated;
grant usage, select on sequence public.print_jobs_reference_number_seq to authenticated;

create policy organizations_select_member on public.organizations for select to authenticated
  using ((select private.is_organization_member(id)));
create policy organizations_update_admin on public.organizations for update to authenticated
  using ((select private.has_organization_role(id, array['OWNER','ADMIN']::public.organization_role[])))
  with check ((select private.has_organization_role(id, array['OWNER','ADMIN']::public.organization_role[])));

create policy profiles_select_related on public.profiles for select to authenticated
  using (
    id = (select auth.uid()) or exists (
      select 1 from public.organization_members mine
      join public.organization_members theirs using (organization_id)
      where mine.user_id = (select auth.uid()) and theirs.user_id = profiles.id
    )
  );
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy members_select_member on public.organization_members for select to authenticated
  using ((select private.is_organization_member(organization_id)));
create policy members_insert_admin on public.organization_members for insert to authenticated
  with check ((select private.has_organization_role(organization_id, array['OWNER','ADMIN']::public.organization_role[])));
create policy members_update_admin on public.organization_members for update to authenticated
  using ((select private.has_organization_role(organization_id, array['OWNER','ADMIN']::public.organization_role[])))
  with check ((select private.has_organization_role(organization_id, array['OWNER','ADMIN']::public.organization_role[])));
create policy members_delete_admin on public.organization_members for delete to authenticated
  using ((select private.has_organization_role(organization_id, array['OWNER','ADMIN']::public.organization_role[])));

create policy workstations_select_member on public.workstations for select to authenticated
  using ((select private.is_organization_member(organization_id)));
create policy workstations_insert_admin on public.workstations for insert to authenticated
  with check ((select private.has_organization_role(organization_id, array['OWNER','ADMIN']::public.organization_role[])));
create policy workstations_update_admin on public.workstations for update to authenticated
  using ((select private.has_organization_role(organization_id, array['OWNER','ADMIN']::public.organization_role[])))
  with check ((select private.has_organization_role(organization_id, array['OWNER','ADMIN']::public.organization_role[])));
create policy workstations_delete_admin on public.workstations for delete to authenticated
  using ((select private.has_organization_role(organization_id, array['OWNER','ADMIN']::public.organization_role[])));

-- Tenant-scoped operational tables use the same read boundary. Operators may write; viewers may not.
create policy printers_select_member on public.printers for select to authenticated
  using ((select private.is_organization_member(organization_id)));
create policy printers_insert_operator on public.printers for insert to authenticated
  with check ((select private.has_organization_role(organization_id, array['OWNER','ADMIN','OPERATOR']::public.organization_role[])));
create policy printers_update_operator on public.printers for update to authenticated
  using ((select private.has_organization_role(organization_id, array['OWNER','ADMIN','OPERATOR']::public.organization_role[])))
  with check ((select private.has_organization_role(organization_id, array['OWNER','ADMIN','OPERATOR']::public.organization_role[])));
create policy printers_delete_admin on public.printers for delete to authenticated
  using ((select private.has_organization_role(organization_id, array['OWNER','ADMIN']::public.organization_role[])));

create policy capabilities_select_member on public.printer_capabilities for select to authenticated
  using ((select private.is_organization_member(organization_id)));
create policy capabilities_insert_operator on public.printer_capabilities for insert to authenticated
  with check ((select private.has_organization_role(organization_id, array['OWNER','ADMIN','OPERATOR']::public.organization_role[])));
create policy capabilities_update_operator on public.printer_capabilities for update to authenticated
  using ((select private.has_organization_role(organization_id, array['OWNER','ADMIN','OPERATOR']::public.organization_role[])))
  with check ((select private.has_organization_role(organization_id, array['OWNER','ADMIN','OPERATOR']::public.organization_role[])));

create policy printer_materials_select_member on public.printer_materials for select to authenticated
  using ((select private.is_organization_member(organization_id)));
create policy printer_materials_insert_admin on public.printer_materials for insert to authenticated
  with check ((select private.has_organization_role(organization_id, array['OWNER','ADMIN']::public.organization_role[])));
create policy printer_materials_update_admin on public.printer_materials for update to authenticated
  using ((select private.has_organization_role(organization_id, array['OWNER','ADMIN']::public.organization_role[])))
  with check ((select private.has_organization_role(organization_id, array['OWNER','ADMIN']::public.organization_role[])));
create policy printer_materials_delete_admin on public.printer_materials for delete to authenticated
  using ((select private.has_organization_role(organization_id, array['OWNER','ADMIN']::public.organization_role[])));

create policy sessions_select_member on public.print_sessions for select to authenticated
  using ((select private.is_organization_member(organization_id)));
create policy sessions_insert_operator on public.print_sessions for insert to authenticated
  with check (
    (select private.has_organization_role(organization_id, array['OWNER','ADMIN','OPERATOR']::public.organization_role[]))
    and created_by = (select auth.uid())
  );
create policy sessions_update_operator on public.print_sessions for update to authenticated
  using ((select private.has_organization_role(organization_id, array['OWNER','ADMIN','OPERATOR']::public.organization_role[])))
  with check ((select private.has_organization_role(organization_id, array['OWNER','ADMIN','OPERATOR']::public.organization_role[])));

create policy documents_select_member on public.documents for select to authenticated
  using ((select private.is_organization_member(organization_id)));
create policy documents_insert_operator on public.documents for insert to authenticated
  with check ((select private.has_organization_role(organization_id, array['OWNER','ADMIN','OPERATOR']::public.organization_role[])));
create policy documents_update_operator on public.documents for update to authenticated
  using ((select private.has_organization_role(organization_id, array['OWNER','ADMIN','OPERATOR']::public.organization_role[])))
  with check ((select private.has_organization_role(organization_id, array['OWNER','ADMIN','OPERATOR']::public.organization_role[])));

create policy jobs_select_member on public.print_jobs for select to authenticated
  using ((select private.is_organization_member(organization_id)));
create policy jobs_insert_operator on public.print_jobs for insert to authenticated
  with check ((select private.has_organization_role(organization_id, array['OWNER','ADMIN','OPERATOR']::public.organization_role[])));
create policy jobs_update_operator on public.print_jobs for update to authenticated
  using ((select private.has_organization_role(organization_id, array['OWNER','ADMIN','OPERATOR']::public.organization_role[])))
  with check ((select private.has_organization_role(organization_id, array['OWNER','ADMIN','OPERATOR']::public.organization_role[])));

create policy settings_select_member on public.print_settings for select to authenticated
  using ((select private.is_organization_member(organization_id)));
create policy settings_insert_operator on public.print_settings for insert to authenticated
  with check ((select private.has_organization_role(organization_id, array['OWNER','ADMIN','OPERATOR']::public.organization_role[])));
create policy settings_update_operator on public.print_settings for update to authenticated
  using ((select private.has_organization_role(organization_id, array['OWNER','ADMIN','OPERATOR']::public.organization_role[])))
  with check ((select private.has_organization_role(organization_id, array['OWNER','ADMIN','OPERATOR']::public.organization_role[])));

create policy materials_select_member on public.materials for select to authenticated
  using ((select private.is_organization_member(organization_id)));
create policy materials_insert_admin on public.materials for insert to authenticated
  with check ((select private.has_organization_role(organization_id, array['OWNER','ADMIN']::public.organization_role[])));
create policy materials_update_admin on public.materials for update to authenticated
  using ((select private.has_organization_role(organization_id, array['OWNER','ADMIN']::public.organization_role[])))
  with check ((select private.has_organization_role(organization_id, array['OWNER','ADMIN']::public.organization_role[])));
create policy materials_delete_admin on public.materials for delete to authenticated
  using ((select private.has_organization_role(organization_id, array['OWNER','ADMIN']::public.organization_role[])));

create policy finishes_select_member on public.finishes for select to authenticated
  using ((select private.is_organization_member(organization_id)));
create policy finishes_insert_admin on public.finishes for insert to authenticated
  with check ((select private.has_organization_role(organization_id, array['OWNER','ADMIN']::public.organization_role[])));
create policy finishes_update_admin on public.finishes for update to authenticated
  using ((select private.has_organization_role(organization_id, array['OWNER','ADMIN']::public.organization_role[])))
  with check ((select private.has_organization_role(organization_id, array['OWNER','ADMIN']::public.organization_role[])));
create policy finishes_delete_admin on public.finishes for delete to authenticated
  using ((select private.has_organization_role(organization_id, array['OWNER','ADMIN']::public.organization_role[])));

create policy job_finishes_select_member on public.print_job_finishes for select to authenticated
  using ((select private.is_organization_member(organization_id)));
create policy job_finishes_insert_operator on public.print_job_finishes for insert to authenticated
  with check ((select private.has_organization_role(organization_id, array['OWNER','ADMIN','OPERATOR']::public.organization_role[])));
create policy job_finishes_update_operator on public.print_job_finishes for update to authenticated
  using ((select private.has_organization_role(organization_id, array['OWNER','ADMIN','OPERATOR']::public.organization_role[])))
  with check ((select private.has_organization_role(organization_id, array['OWNER','ADMIN','OPERATOR']::public.organization_role[])));
create policy job_finishes_delete_operator on public.print_job_finishes for delete to authenticated
  using ((select private.has_organization_role(organization_id, array['OWNER','ADMIN','OPERATOR']::public.organization_role[])));

create policy pricing_select_member on public.pricing_rules for select to authenticated
  using ((select private.is_organization_member(organization_id)));
create policy pricing_insert_admin on public.pricing_rules for insert to authenticated
  with check ((select private.has_organization_role(organization_id, array['OWNER','ADMIN']::public.organization_role[])));
create policy pricing_update_admin on public.pricing_rules for update to authenticated
  using ((select private.has_organization_role(organization_id, array['OWNER','ADMIN']::public.organization_role[])))
  with check ((select private.has_organization_role(organization_id, array['OWNER','ADMIN']::public.organization_role[])));
create policy pricing_delete_admin on public.pricing_rules for delete to authenticated
  using ((select private.has_organization_role(organization_id, array['OWNER','ADMIN']::public.organization_role[])));

create policy audit_select_member on public.audit_logs for select to authenticated
  using (organization_id is not null and (select private.is_organization_member(organization_id)));
-- deletion_requests is intentionally service-role only: no authenticated grants or policies.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  false,
  83886080,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy documents_storage_select_member on storage.objects for select to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] in (
      select organization_id::text from private.current_organization_ids()
    )
  );
create policy documents_storage_insert_operator on storage.objects for insert to authenticated
  with check (
    bucket_id = 'documents'
    and exists (
      select 1
      from public.organization_members om
      where om.organization_id::text = (storage.foldername(name))[1]
        and om.user_id = (select auth.uid())
        and om.role in ('OWNER', 'ADMIN', 'OPERATOR')
    )
  );
create policy documents_storage_update_operator on storage.objects for update to authenticated
  using (
    bucket_id = 'documents'
    and exists (
      select 1
      from public.organization_members om
      where om.organization_id::text = (storage.foldername(name))[1]
        and om.user_id = (select auth.uid())
        and om.role in ('OWNER', 'ADMIN', 'OPERATOR')
    )
  )
  with check (
    bucket_id = 'documents'
    and exists (
      select 1
      from public.organization_members om
      where om.organization_id::text = (storage.foldername(name))[1]
        and om.user_id = (select auth.uid())
        and om.role in ('OWNER', 'ADMIN', 'OPERATOR')
    )
  );
create policy documents_storage_delete_operator on storage.objects for delete to authenticated
  using (
    bucket_id = 'documents'
    and exists (
      select 1
      from public.organization_members om
      where om.organization_id::text = (storage.foldername(name))[1]
        and om.user_id = (select auth.uid())
        and om.role in ('OWNER', 'ADMIN', 'OPERATOR')
    )
  );

commit;
