create table if not exists public.advertisement_center_settings (
  id boolean primary key default true check (id),
  daily_budget numeric(12, 2) not null default 500 check (daily_budget >= 0),
  target_country text not null default 'Türkiye',
  excluded_regions text[] not null default array['Antalya']::text[],
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create table if not exists public.advertisement_product_settings (
  product_id uuid primary key references public.products(id) on delete cascade,
  is_included boolean not null default false,
  priority text not null default 'normal'
    check (priority in ('very_high', 'high', 'normal', 'low')),
  ad_types text[] not null default array['instagram_feed']::text[],
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  check (ad_types <@ array[
    'instagram_feed', 'instagram_story', 'instagram_reels',
    'facebook_feed', 'dynamic_catalog'
  ]::text[])
);

alter table public.advertisement_center_settings enable row level security;
alter table public.advertisement_product_settings enable row level security;

create policy advertisement_center_settings_admin_all
on public.advertisement_center_settings for all to authenticated
using ((select public.current_user_is_admin()))
with check ((select public.current_user_is_admin()));

create policy advertisement_product_settings_admin_all
on public.advertisement_product_settings for all to authenticated
using ((select public.current_user_is_admin()))
with check ((select public.current_user_is_admin()));

grant select, insert, update, delete on public.advertisement_center_settings to authenticated;
grant select, insert, update, delete on public.advertisement_product_settings to authenticated;

insert into public.advertisement_center_settings (id)
values (true)
on conflict (id) do nothing;

