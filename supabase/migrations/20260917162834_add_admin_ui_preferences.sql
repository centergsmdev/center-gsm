create table if not exists public.admin_ui_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  menu_order jsonb not null default '[]'::jsonb,
  menu_presets jsonb not null default '{}'::jsonb,
  activity_seen_at jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint admin_ui_preferences_menu_order_array
    check (jsonb_typeof(menu_order) = 'array'),
  constraint admin_ui_preferences_menu_presets_object
    check (jsonb_typeof(menu_presets) = 'object'),
  constraint admin_ui_preferences_activity_seen_object
    check (jsonb_typeof(activity_seen_at) = 'object')
);

drop trigger if exists set_admin_ui_preferences_updated_at
on public.admin_ui_preferences;
create trigger set_admin_ui_preferences_updated_at
before update on public.admin_ui_preferences
for each row execute function public.set_updated_at();

alter table public.admin_ui_preferences enable row level security;

revoke all on public.admin_ui_preferences from public, anon, authenticated;
grant select, insert, update on public.admin_ui_preferences to authenticated;

drop policy if exists "Admins manage own UI preferences"
on public.admin_ui_preferences;
create policy "Admins manage own UI preferences"
on public.admin_ui_preferences
for all
to authenticated
using (
  (select auth.uid()) = user_id
  and public.is_admin()
)
with check (
  (select auth.uid()) = user_id
  and public.is_admin()
);

comment on table public.admin_ui_preferences is
  'Per-admin navigation presets and last-seen timestamps for operational activity indicators.';

grant select on public.installment_applications to authenticated;
grant select on public.trade_in_applications to authenticated;

drop policy if exists "Admins view installment applications"
on public.installment_applications;
create policy "Admins view installment applications"
on public.installment_applications
for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins view trade in applications"
on public.trade_in_applications;
create policy "Admins view trade in applications"
on public.trade_in_applications
for select
to authenticated
using (public.is_admin());

do $$
declare
  v_table_name text;
begin
  foreach v_table_name in array array[
    'installment_applications',
    'trade_in_applications',
    'customer_profiles'
  ]
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = v_table_name
    ) then
      execute format(
        'alter publication supabase_realtime add table public.%I',
        v_table_name
      );
    end if;
  end loop;
end $$;

notify pgrst, 'reload schema';
