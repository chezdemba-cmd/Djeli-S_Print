begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

insert into auth.users (id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values ('b1000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','jobs@example.test','',now(),'{}','{}',now(),now());
insert into public.organizations (id,name,slug) values ('b2000000-0000-0000-0000-000000000001','Jobs Shop','jobs-shop');
insert into public.organization_members values ('b2000000-0000-0000-0000-000000000001','b1000000-0000-0000-0000-000000000001','OWNER',now());
insert into public.workstations (id,organization_id,name) values ('b3000000-0000-0000-0000-000000000001','b2000000-0000-0000-0000-000000000001','Jobs desk');
insert into public.printers (id,organization_id,workstation_id,system_name,display_name) values ('b4000000-0000-0000-0000-000000000001','b2000000-0000-0000-0000-000000000001','b3000000-0000-0000-0000-000000000001','printer','Printer');
insert into public.printer_capabilities (printer_id,organization_id,formats,supports_color) values ('b4000000-0000-0000-0000-000000000001','b2000000-0000-0000-0000-000000000001',array['A4','A3']::public.paper_format[],false);
insert into public.print_sessions (id,organization_id,workstation_id,token_hash,status,expires_at,documents_received,created_by) values ('b5000000-0000-0000-0000-000000000001','b2000000-0000-0000-0000-000000000001','b3000000-0000-0000-0000-000000000001',repeat('d',64),'CONSUMED',now()+interval '10 minutes',1,'b1000000-0000-0000-0000-000000000001');
insert into public.documents (id,organization_id,print_session_id,storage_path,original_filename,display_name,mime_type,size_bytes,status,expires_at) values ('b6000000-0000-0000-0000-000000000001','b2000000-0000-0000-0000-000000000001','b5000000-0000-0000-0000-000000000001','b2000000-0000-0000-0000-000000000001/b6000000-0000-0000-0000-000000000001/original.pdf','test.pdf','test.pdf','application/pdf',100,'READY',now()+interval '20 minutes');

set local role authenticated;
select set_config('request.jwt.claim.sub','b1000000-0000-0000-0000-000000000001',true);
select lives_ok($$ select * from public.create_print_job('b6000000-0000-0000-0000-000000000001','b4000000-0000-0000-0000-000000000001','A4','PORTRAIT','BLACK_AND_WHITE',2) $$,'compatible job is created');
select is((select status::text from public.documents where id='b6000000-0000-0000-0000-000000000001'),'WAITING_OPERATOR','document advances atomically');
select is((select copies from public.print_settings limit 1),2,'settings are persisted');
select throws_ok($$ select * from public.create_print_job('b6000000-0000-0000-0000-000000000001','b4000000-0000-0000-0000-000000000001','A4','PORTRAIT','BLACK_AND_WHITE',2) $$,'55000','Document is not ready','duplicate job is rejected');

select * from finish();
rollback;
