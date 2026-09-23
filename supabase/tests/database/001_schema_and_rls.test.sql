begin;

create extension if not exists pgtap with schema extensions;
select plan(8);

select has_table('public', 'organizations', 'organizations exists');
select has_table('public', 'documents', 'documents exists');
select has_table('public', 'print_jobs', 'print_jobs exists');
select has_table('public', 'deletion_requests', 'deletion queue exists');

select ok(
  (
    select bool_and(c.relrowsecurity)
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relname in (
        'organizations', 'profiles', 'organization_members', 'workstations', 'printers',
        'printer_capabilities', 'printer_materials', 'print_sessions', 'documents',
        'print_jobs', 'print_settings', 'materials', 'finishes', 'print_job_finishes',
        'pricing_rules', 'audit_logs', 'deletion_requests'
      )
  ),
  'RLS is enabled on every application table'
);

select is(
  (select public from storage.buckets where id = 'documents'),
  false,
  'documents bucket is private'
);

select is(
  (select file_size_limit from storage.buckets where id = 'documents'),
  83886080::bigint,
  'documents bucket has an 80 MiB limit'
);

select is(
  (
    select count(*)::integer
    from information_schema.role_table_grants
    where table_schema = 'public'
      and grantee = 'anon'
      and privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
  ),
  0,
  'anon has no direct CRUD grant on public tables'
);

select * from finish();
rollback;
