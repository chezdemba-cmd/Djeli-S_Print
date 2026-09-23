begin;

create extension if not exists pgtap with schema extensions;
select plan(7);

set local role postgres;

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'owner-a@example.test', '', now(), '{}', '{}', now(), now()),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'owner-b@example.test', '', now(), '{}', '{}', now(), now()),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'viewer-a@example.test', '', now(), '{}', '{}', now(), now());

insert into public.organizations (id, name, slug)
values
  ('20000000-0000-0000-0000-000000000001', 'Tenant A', 'tenant-a'),
  ('20000000-0000-0000-0000-000000000002', 'Tenant B', 'tenant-b');

insert into public.organization_members (organization_id, user_id, role)
values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'OWNER'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'OWNER'),
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'VIEWER');

insert into public.workstations (id, organization_id, name)
values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Poste A'),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'Poste B');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select is(
  (select count(*)::integer from public.organizations),
  1,
  'owner A sees only tenant A'
);
select is(
  (select count(*)::integer from public.workstations),
  1,
  'owner A sees only tenant A workstations'
);
select results_eq(
  $$ update public.organizations set name = 'Compromised' where slug = 'tenant-b' returning id $$,
  $$ values (null::uuid) limit 0 $$,
  'owner A cannot update tenant B'
);
select results_eq(
  $$ update public.organizations set name = 'Tenant A updated' where slug = 'tenant-a' returning id $$,
  $$ values ('20000000-0000-0000-0000-000000000001'::uuid) $$,
  'owner A can update tenant A'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000003","role":"authenticated"}',
  true
);

select results_eq(
  $$ update public.workstations set name = 'Viewer edit' where id = '30000000-0000-0000-0000-000000000001' returning id $$,
  $$ values (null::uuid) limit 0 $$,
  'viewer cannot update workstation'
);

set local role postgres;
select throws_ok(
  $$ delete from public.organization_members
     where organization_id = '20000000-0000-0000-0000-000000000002'
       and user_id = '10000000-0000-0000-0000-000000000002' $$,
  '23514',
  'An organization must retain at least one owner',
  'last owner cannot be removed'
);

insert into public.audit_logs (organization_id, action, entity_type)
values ('20000000-0000-0000-0000-000000000001', 'test.created', 'test');
select throws_ok(
  $$ update public.audit_logs set action = 'test.modified' where action = 'test.created' $$,
  '42501',
  'Audit logs are immutable',
  'audit rows cannot be changed'
);

select * from finish();
rollback;
