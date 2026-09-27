begin;

create extension if not exists pgtap with schema extensions;
select plan(4);

set local role postgres;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('b1000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','owner-del@example.test','',now(),'{}','{}',now(),now()),
  ('b1000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','viewer-del@example.test','',now(),'{}','{}',now(),now());

insert into public.organizations (id,name,slug) values ('b2000000-0000-0000-0000-000000000001','Delete Shop','delete-shop');

insert into public.organization_members (organization_id,user_id,role)
values
  ('b2000000-0000-0000-0000-000000000001','b1000000-0000-0000-0000-000000000001','OWNER'),
  ('b2000000-0000-0000-0000-000000000001','b1000000-0000-0000-0000-000000000002','VIEWER');

insert into public.workstations (id,organization_id,name) values ('b3000000-0000-0000-0000-000000000001','b2000000-0000-0000-0000-000000000001','Delete desk');

insert into public.print_sessions (id,organization_id,workstation_id,token_hash,expires_at,created_by)
values ('b4000000-0000-0000-0000-000000000001','b2000000-0000-0000-0000-000000000001','b3000000-0000-0000-0000-000000000001',repeat('d',64),now()+interval '10 minutes','b1000000-0000-0000-0000-000000000001');

insert into public.documents (id, organization_id, print_session_id, storage_path, original_filename, display_name, mime_type, size_bytes, status, expires_at)
values
  ('b5000000-0000-0000-0000-000000000001','b2000000-0000-0000-0000-000000000001','b4000000-0000-0000-0000-000000000001','b2000000-0000-0000-0000-000000000001/b5000000-0000-0000-0000-000000000001/original.pdf','client.pdf','client.pdf','application/pdf',1024,'READY',now()+interval '20 minutes'),
  ('b5000000-0000-0000-0000-000000000002','b2000000-0000-0000-0000-000000000001','b4000000-0000-0000-0000-000000000001','b2000000-0000-0000-0000-000000000001/b5000000-0000-0000-0000-000000000002/original.pdf','printing.pdf','printing.pdf','application/pdf',1024,'PRINTING',now()+interval '20 minutes');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'b1000000-0000-0000-0000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"b1000000-0000-0000-0000-000000000002","role":"authenticated"}', true);

select throws_ok(
  $$ select public.request_document_deletion('b5000000-0000-0000-0000-000000000001') $$,
  '42501', 'Insufficient permission', 'viewer cannot request document deletion'
);

select set_config('request.jwt.claim.sub', 'b1000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"b1000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

select throws_ok(
  $$ select public.request_document_deletion('b5000000-0000-0000-0000-000000000002') $$,
  '55000', 'Document cannot be deleted in its current state', 'operator cannot delete a document that is printing'
);

select lives_ok(
  $$ select public.request_document_deletion('b5000000-0000-0000-0000-000000000001') $$,
  'operator can request deletion of a ready document'
);
select ok(
  (select expires_at <= clock_timestamp() from public.documents where id = 'b5000000-0000-0000-0000-000000000001'),
  'document is force-expired for the next cleanup sweep'
);

select * from finish();
rollback;
