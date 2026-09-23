begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

insert into auth.users (id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values ('c1000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','deletion@example.test','',now(),'{}','{}',now(),now());
insert into public.organizations (id,name,slug) values ('c2000000-0000-0000-0000-000000000001','Deletion Shop','deletion-shop');
insert into public.organization_members values ('c2000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000001','OWNER',now());
insert into public.workstations (id,organization_id,name) values ('c3000000-0000-0000-0000-000000000001','c2000000-0000-0000-0000-000000000001','Deletion desk');
insert into public.print_sessions (id,organization_id,workstation_id,token_hash,status,expires_at,documents_received,created_by)
values ('c4000000-0000-0000-0000-000000000001','c2000000-0000-0000-0000-000000000001','c3000000-0000-0000-0000-000000000001',repeat('e',64),'CONSUMED',clock_timestamp()+interval '10 minutes',1,'c1000000-0000-0000-0000-000000000001');
insert into public.documents (id,organization_id,print_session_id,storage_path,original_filename,display_name,mime_type,size_bytes,status,expires_at)
values ('c5000000-0000-0000-0000-000000000001','c2000000-0000-0000-0000-000000000001','c4000000-0000-0000-0000-000000000001','c2000000-0000-0000-0000-000000000001/c5000000-0000-0000-0000-000000000001/private.pdf','private-name.pdf','private-name.pdf','application/pdf',100,'PRINTING',clock_timestamp()+interval '20 minutes');

select lives_ok($$ update public.documents set status='PRINTED' where id='c5000000-0000-0000-0000-000000000001' $$,'printing completion queues deletion');
select is((select count(*)::integer from public.deletion_requests where document_id='c5000000-0000-0000-0000-000000000001'),1,'one deletion request exists');
select is((select count(*)::integer from public.claim_document_deletions(10)),1,'worker claims the request');
select lives_ok($$ select public.complete_document_deletion((select id from public.deletion_requests where document_id='c5000000-0000-0000-0000-000000000001'),true,null) $$,'worker completes deletion');
select is((select status::text from public.documents where id='c5000000-0000-0000-0000-000000000001'),'DELETED','document is marked deleted');
select is((select display_name from public.documents where id='c5000000-0000-0000-0000-000000000001'),'[deleted]','sensitive filename is scrubbed');

select * from finish();
rollback;
