begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('a1000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','upload@example.test','',now(),'{}','{}',now(),now());
insert into public.organizations (id,name,slug) values ('a2000000-0000-0000-0000-000000000001','Upload Shop','upload-shop');
insert into public.organization_members values ('a2000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','OWNER',now());
insert into public.workstations (id,organization_id,name) values ('a3000000-0000-0000-0000-000000000001','a2000000-0000-0000-0000-000000000001','Upload desk');
insert into public.print_sessions (id,organization_id,workstation_id,token_hash,expires_at,created_by)
values ('a4000000-0000-0000-0000-000000000001','a2000000-0000-0000-0000-000000000001','a3000000-0000-0000-0000-000000000001',repeat('c',64),now()+interval '10 minutes','a1000000-0000-0000-0000-000000000001');

set local role service_role;
select lives_ok(
  $$ select * from public.reserve_document_upload(repeat('c',64),'client.pdf','application/pdf',1024) $$,
  'valid upload is reserved atomically'
);
select is((select status::text from public.print_sessions where id='a4000000-0000-0000-0000-000000000001'),'ACTIVE','reservation alone does not consume the quota');
select is((select documents_received from public.print_sessions where id='a4000000-0000-0000-0000-000000000001'),0::smallint,'documents_received stays at zero until finalize');
select is((select status::text from public.documents where print_session_id='a4000000-0000-0000-0000-000000000001'),'UPLOADING','document starts as uploading');

select lives_ok(
  $$ select * from public.reserve_document_upload(repeat('c',64),'concurrent.pdf','application/pdf',1024) $$,
  'a concurrent reservation may exist before either upload finalizes'
);
select lives_ok(
  $$ select public.finalize_document_upload(
    'a4000000-0000-0000-0000-000000000001',
    (select id from public.documents where original_filename='client.pdf')
  ) $$,
  'finalize atomically consumes the upload slot and receives the document'
);
select is((select status::text from public.print_sessions where id='a4000000-0000-0000-0000-000000000001'),'CONSUMED','single-use session is consumed after finalize');
select is((select status::text from public.documents where original_filename='client.pdf'),'RECEIVED','finalized document is received in the same transaction');

select throws_ok(
  $$ select public.finalize_document_upload(
    'a4000000-0000-0000-0000-000000000001',
    (select id from public.documents where original_filename='concurrent.pdf')
  ) $$,
  'P0002','Upload quota unavailable','a concurrent reservation cannot exceed the finalized quota'
);
select is((select status::text from public.documents where original_filename='concurrent.pdf'),'UPLOADING','rejected finalization does not partially update the document');

select throws_ok(
  $$ select * from public.reserve_document_upload(repeat('c',64),'second.pdf','application/pdf',1024) $$,
  'P0002','Session unavailable','session cannot reserve a second document once consumed'
);

select * from finish();
rollback;
