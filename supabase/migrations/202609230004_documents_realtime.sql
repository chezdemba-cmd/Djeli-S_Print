begin;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'documents'
  ) then
    alter publication supabase_realtime add table public.documents;
  end if;
end;
$$;

comment on table public.documents is
  'Private tenant-scoped documents. Realtime events remain filtered by the subscriber RLS policy.';

commit;
