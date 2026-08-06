create table if not exists public.site_settings (
  id boolean primary key default true check (id),
  company_name text not null default 'CENTER GSM Teknoloji A.Ş.',
  tax_number text,
  logo_url text,
  contact_email text,
  phone text,
  address text,
  instagram_url text,
  youtube_url text,
  twitter_url text,
  free_shipping_limit numeric(12,2) not null default 2500 check (free_shipping_limit >= 0),
  same_day_shipping_enabled boolean not null default true,
  phone_approval_enabled boolean not null default true,
  bank_transfer_enabled boolean not null default true,
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references auth.users(id) on delete set null
);

insert into public.site_settings (id) values (true) on conflict (id) do nothing;

alter table public.site_settings enable row level security;

create policy "Public can read site settings"
on public.site_settings for select to anon, authenticated
using (id = true);

create policy "Admins can update site settings"
on public.site_settings for update to authenticated
using ((select public.current_user_is_admin()))
with check (id = true and (select public.current_user_is_admin()));

revoke all on table public.site_settings from anon, authenticated;
grant select on table public.site_settings to anon, authenticated;
grant update on table public.site_settings to authenticated;

notify pgrst, 'reload schema';
