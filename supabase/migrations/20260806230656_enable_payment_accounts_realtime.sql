do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'payment_accounts'
  ) then
    alter publication supabase_realtime add table public.payment_accounts;
  end if;
end
$$;
