begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

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
select is((select status::text from public.print_sessions where id='a4000000-0000-0000-0000-000000000001'),'CONSUMED','single-use session is consumed');
select is((select status::text from public.documents where print_session_id='a4000000-0000-0000-0000-000000000001'),'UPLOADING','document starts as uploading');
select throws_ok(
  $$ select * from public.reserve_document_upload(repeat('c',64),'second.pdf','application/pdf',1024) $$,
  'P0002','Session unavailable','session cannot reserve a second document'
);

select * from finish();
rollback;
