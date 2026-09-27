begin;

create extension if not exists pgtap with schema extensions;
select plan(10);

set local role postgres;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('e1000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','owner-daypass@example.test','',now(),'{}','{}',now(),now()),
  ('e1000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','viewer-daypass@example.test','',now(),'{}','{}',now(),now());

insert into public.organizations (id,name,slug) values ('e2000000-0000-0000-0000-000000000001','Day Pass Shop','day-pass-shop');

insert into public.organization_members (organization_id,user_id,role)
values
  ('e2000000-0000-0000-0000-000000000001','e1000000-0000-0000-0000-000000000001','OWNER'),
  ('e2000000-0000-0000-0000-000000000001','e1000000-0000-0000-0000-000000000002','VIEWER');

insert into public.workstations (id,organization_id,name) values ('e3000000-0000-0000-0000-000000000001','e2000000-0000-0000-0000-000000000001','Comptoir jour');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'e1000000-0000-0000-0000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"e1000000-0000-0000-0000-000000000002","role":"authenticated"}', true);

select throws_ok(
  $$ select public.create_qr_session('e3000000-0000-0000-0000-000000000001', repeat('a', 64), 86400) $$,
  '42501', 'Insufficient permission', 'viewer cannot create a QR session'
);
select throws_ok(
  $$ select public.resolve_active_qr_session('e3000000-0000-0000-0000-000000000001') $$,
  '42501', 'Insufficient permission', 'viewer cannot resolve the active QR session'
);

select set_config('request.jwt.claim.sub', 'e1000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"e1000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

select throws_ok(
  $$ select public.create_qr_session('e3000000-0000-0000-0000-000000000001', repeat('a', 64), 60) $$,
  '22023', 'Invalid session duration', 'a too-short duration is rejected'
);

select is(
  (select count(*)::integer from public.resolve_active_qr_session('e3000000-0000-0000-0000-000000000001')),
  0,
  'no active session exists yet for a fresh workstation'
);

select lives_ok(
  $$ select public.create_qr_session('e3000000-0000-0000-0000-000000000001', repeat('a', 64), 86400) $$,
  'operator can create the day-pass session'
);
select is(
  (select max_documents from public.print_sessions where token_hash = repeat('a', 64)),
  30000::smallint,
  'the day-pass session carries an effectively unlimited document quota'
);

-- Regenerating must revoke the first token (so it stops working immediately)
-- and leave exactly one ACTIVE session for the workstation.
select lives_ok(
  $$ select public.create_qr_session('e3000000-0000-0000-0000-000000000001', repeat('b', 64), 86400) $$,
  'operator can regenerate the day-pass session'
);
select is(
  (select status::text from public.print_sessions where token_hash = repeat('a', 64)),
  'REVOKED',
  'the previous token is revoked once a new one is created'
);
select is(
  (select count(*)::integer from public.print_sessions where workstation_id = 'e3000000-0000-0000-0000-000000000001' and status = 'ACTIVE'),
  1,
  'at most one active session remains for the workstation'
);
select is(
  (select count(*)::integer from public.resolve_active_qr_session('e3000000-0000-0000-0000-000000000001')),
  1,
  'resolve_active_qr_session now reports the regenerated session'
);

select * from finish();
rollback;
