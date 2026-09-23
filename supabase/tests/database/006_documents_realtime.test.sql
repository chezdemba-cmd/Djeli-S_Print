begin;
create extension if not exists pgtap with schema extensions;
select plan(2);

select ok(
  exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'documents'
  ),
  'documents is included in the realtime publication'
);
select is(
  (select relrowsecurity from pg_class where oid = 'public.documents'::regclass),
  true,
  'documents keeps RLS enabled while published'
);

select * from finish();
rollback;
