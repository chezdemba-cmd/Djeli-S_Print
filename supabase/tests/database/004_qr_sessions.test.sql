begin;

create extension if not exists pgtap with schema extensions;
select plan(4);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values (
  '91000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'qr@example.test', '', now(), '{}', '{}', now(), now()
);
insert into public.organizations (id, name, slug)
values ('92000000-0000-0000-0000-000000000001', 'QR Shop', 'qr-shop');
insert into public.organization_members (organization_id, user_id, role)
values ('92000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000001', 'OWNER');
insert into public.workstations (id, organization_id, name)
values ('93000000-0000-0000-0000-000000000001', '92000000-0000-0000-0000-000000000001', 'Comptoir');
insert into public.print_sessions (
  id, organization_id, workstation_id, token_hash, expires_at, max_documents, created_by
)
values
  ('94000000-0000-0000-0000-000000000001', '92000000-0000-0000-0000-000000000001',
   '93000000-0000-0000-0000-000000000001', repeat('a', 64), now() + interval '10 minutes', 1,
   '91000000-0000-0000-0000-000000000001'),
  ('94000000-0000-0000-0000-000000000002', '92000000-0000-0000-0000-000000000001',
   '93000000-0000-0000-0000-000000000001', repeat('b', 64), now() - interval '1 minute', 1,
   '91000000-0000-0000-0000-000000000001');

set local role anon;
select is(
  (select organization_name from public.resolve_print_session(repeat('a', 64))),
  'QR Shop',
  'anonymous visitor resolves an active session'
);
select is(
  (select count(*)::integer from public.resolve_print_session(repeat('b', 64))),
  0,
  'expired session cannot be resolved'
);
select is(
  (select count(*)::integer from public.resolve_print_session(repeat('x', 64))),
  0,
  'unknown token cannot be resolved'
);
select throws_ok(
  $$ select * from public.print_sessions $$,
  '42501',
  null,
  'anonymous visitor cannot read session rows directly'
);

select * from finish();
rollback;
