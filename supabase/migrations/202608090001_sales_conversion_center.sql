create table if not exists public.sales_campaigns (
  id uuid primary key default gen_random_uuid(),
  campaign_name text not null check (char_length(trim(campaign_name)) between 2 and 120),
  title text not null check (char_length(trim(title)) between 2 and 160),
  description text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  cta_text text not null default 'Ürünleri İncele',
  cta_href text not null default '/urunler' check (cta_href ~ '^/'),
  is_active boolean not null default false,
  show_popup boolean not null default false,
  show_header boolean not null default false,
  show_product_detail boolean not null default false,
  show_cart boolean not null default false,
  show_exit_intent boolean not null default false,
  show_badges boolean not null default false,
  popup_delay_seconds integer not null default 8 check (popup_delay_seconds between 0 and 300),
  scope_type text not null default 'all' check (scope_type in ('all', 'categories', 'brands', 'products')),
  category_ids uuid[] not null default '{}',
  category_names text[] not null default '{}',
  brand_ids uuid[] not null default '{}',
  brand_names text[] not null default '{}',
  product_ids uuid[] not null default '{}',
  badge_types text[] not null default '{}' check (badge_types <@ array['limited', 'ends_today', 'opportunity']::text[]),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sales_campaigns_date_range check (ends_at > starts_at),
  constraint sales_campaigns_scope_values check (
    scope_type = 'all'
    or (scope_type = 'categories' and cardinality(category_ids) > 0)
    or (scope_type = 'brands' and cardinality(brand_ids) > 0)
    or (scope_type = 'products' and cardinality(product_ids) > 0)
  )
);

create index if not exists sales_campaigns_active_window_idx
  on public.sales_campaigns (starts_at, ends_at)
  where is_active = true;
create index if not exists sales_campaigns_category_ids_idx on public.sales_campaigns using gin (category_ids);
create index if not exists sales_campaigns_brand_ids_idx on public.sales_campaigns using gin (brand_ids);
create index if not exists sales_campaigns_product_ids_idx on public.sales_campaigns using gin (product_ids);

alter table public.sales_campaigns enable row level security;

drop policy if exists "Public can read current sales campaigns" on public.sales_campaigns;
create policy "Public can read current sales campaigns"
on public.sales_campaigns for select
to anon, authenticated
using (is_active = true and starts_at <= now() and ends_at > now());

drop policy if exists "Admins manage sales campaigns" on public.sales_campaigns;
create policy "Admins manage sales campaigns"
on public.sales_campaigns for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop trigger if exists set_sales_campaigns_updated_at on public.sales_campaigns;
create trigger set_sales_campaigns_updated_at
before update on public.sales_campaigns
for each row execute function public.set_updated_at();

grant select on public.sales_campaigns to anon, authenticated;
grant insert, update, delete on public.sales_campaigns to authenticated;
