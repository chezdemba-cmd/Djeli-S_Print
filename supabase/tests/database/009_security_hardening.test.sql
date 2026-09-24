begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

select ok(public.consume_api_rate_limit('test-scope',repeat('a',64),2,60),'first request is allowed');
select ok(public.consume_api_rate_limit('test-scope',repeat('a',64),2,60),'second request is allowed');
select is(public.consume_api_rate_limit('test-scope',repeat('a',64),2,60),false,'request above the limit is rejected');

insert into auth.users (id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values ('d1000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','health@example.test','',now(),'{}','{}',now(),now());
insert into public.organizations (id,name,slug) values ('d2000000-0000-0000-0000-000000000001','Health Shop','health-shop');
insert into public.organization_members values ('d2000000-0000-0000-0000-000000000001','d1000000-0000-0000-0000-000000000001','OWNER',now());
insert into public.workstations (id,organization_id,name,status,last_seen_at)
values ('d3000000-0000-0000-0000-000000000001','d2000000-0000-0000-0000-000000000001','Stale desk','ONLINE',clock_timestamp()-interval '2 minutes');
insert into public.printers (id,organization_id,workstation_id,system_name,display_name)
values ('d4000000-0000-0000-0000-000000000001','d2000000-0000-0000-0000-000000000001','d3000000-0000-0000-0000-000000000001','stale-printer','Stale printer');
insert into public.print_sessions (id,organization_id,workstation_id,token_hash,status,expires_at,documents_received,created_by)
values ('d5000000-0000-0000-0000-000000000001','d2000000-0000-0000-0000-000000000001','d3000000-0000-0000-0000-000000000001',repeat('f',64),'CONSUMED',clock_timestamp()+interval '10 minutes',1,'d1000000-0000-0000-0000-000000000001');
insert into public.documents (id,organization_id,print_session_id,storage_path,original_filename,display_name,mime_type,size_bytes,status,expires_at,updated_at)
values ('d6000000-0000-0000-0000-000000000001','d2000000-0000-0000-0000-000000000001','d5000000-0000-0000-0000-000000000001','d2000000-0000-0000-0000-000000000001/d6000000-0000-0000-0000-000000000001/test.pdf','test.pdf','test.pdf','application/pdf',100,'PROCESSING',clock_timestamp()+interval '20 minutes',clock_timestamp()-interval '11 minutes');
insert into public.print_jobs (id,organization_id,document_id,printer_id,status,claimed_by_workstation_id,claimed_at,created_by,updated_at)
values ('d7000000-0000-0000-0000-000000000001','d2000000-0000-0000-0000-000000000001','d6000000-0000-0000-0000-000000000001','d4000000-0000-0000-0000-000000000001','PROCESSING','d3000000-0000-0000-0000-000000000001',clock_timestamp()-interval '11 minutes','d1000000-0000-0000-0000-000000000001',clock_timestamp()-interval '11 minutes');

create temporary table health_result as select * from public.maintain_print_agent_health();
select is((select offline_workstations from health_result),1,'stale workstation is counted');
select is((select failed_jobs from health_result),1,'stale job is counted');
select is((select status::text from public.workstations where id='d3000000-0000-0000-0000-000000000001'),'OFFLINE','stale workstation becomes offline');
select is((select status::text from public.print_jobs where id='d7000000-0000-0000-0000-000000000001'),'FAILED','stale job fails safely');
select is((select status::text from public.documents where id='d6000000-0000-0000-0000-000000000001'),'FAILED','stale document is released from processing');

select * from finish();
rollback;
