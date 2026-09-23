begin;

create extension if not exists pgtap with schema extensions;
select plan(3);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values (
  '40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'transition@example.test', '', now(), '{}', '{}', now(), now()
);
insert into public.organizations (id, name, slug)
values ('50000000-0000-0000-0000-000000000001', 'Transitions', 'transitions');
insert into public.organization_members (organization_id, user_id, role)
values (
  '50000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001',
  'OWNER'
);
insert into public.workstations (id, organization_id, name)
values (
  '60000000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000001',
  'Transition station'
);
insert into public.print_sessions (
  id, organization_id, workstation_id, token_hash, expires_at, created_by
)
values (
  '70000000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000001',
  '60000000-0000-0000-0000-000000000001',
  repeat('a', 43),
  now() + interval '10 minutes',
  '40000000-0000-0000-0000-000000000001'
);
insert into public.documents (
  id, organization_id, print_session_id, storage_path, original_filename,
  display_name, mime_type, size_bytes, expires_at, created_at
)
values (
  '80000000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000001/80000000-0000-0000-0000-000000000001/source.pdf',
  'source.pdf', 'source.pdf', 'application/pdf', 1024,
  clock_timestamp() + interval '20 minutes',
  clock_timestamp() - interval '30 minutes'
);

update public.documents set status = 'UPLOADING'
where id = '80000000-0000-0000-0000-000000000001';
select is(
  (select status::text from public.documents where id = '80000000-0000-0000-0000-000000000001'),
  'UPLOADING',
  'CREATED to UPLOADING is allowed'
);

select throws_ok(
  $$ update public.documents set status = 'PRINTED'
     where id = '80000000-0000-0000-0000-000000000001' $$,
  '23514',
  'Invalid status transition: UPLOADING -> PRINTED',
  'invalid transition is rejected'
);

update public.documents
set expires_at = clock_timestamp() - interval '1 minute'
where id = '80000000-0000-0000-0000-000000000001';
select is(public.enqueue_expired_documents(10), 1, 'expired document is queued once');

select * from finish();
rollback;
