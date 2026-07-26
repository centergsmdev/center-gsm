-- CENTER GSM - Empty database master migration
-- Generated from every supabase/migrations SQL file in filename order.
-- PL/pgSQL dollar-quote boundaries are normalized for PostgreSQL SQL Editor.
-- Run only on a new Supabase database. All steps are atomic.

begin;

-- ============================================================================
-- SOURCE: supabase/migrations/202607240001_initial_commerce_schema.sql
-- ============================================================================
create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  is_active boolean not null default true,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  logo_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  sku text not null unique,
  description text,
  short_description text,
  category_id uuid not null references public.categories(id) on update cascade on delete restrict,
  brand_id uuid not null references public.brands(id) on update cascade on delete restrict,
  price numeric(12,2) not null check (price >= 0),
  old_price numeric(12,2) check (old_price is null or old_price >= price),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  is_active boolean not null default true,
  is_featured boolean not null default false,
  warranty_months integer not null default 24 check (warranty_months >= 0),
  rating numeric(2,1) not null default 0 check (rating between 0 and 5),
  review_count integer not null default 0 check (review_count >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on update cascade on delete cascade,
  url text not null,
  alt_text text,
  sort_order integer not null default 0 check (sort_order >= 0),
  is_primary boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (product_id, sort_order)
);

create unique index product_images_one_primary_per_product_idx on public.product_images(product_id) where is_primary;

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on update cascade on delete cascade,
  name text not null,
  sku text not null unique,
  attributes jsonb not null default '{}'::jsonb,
  price numeric(12,2) not null check (price >= 0),
  old_price numeric(12,2) check (old_price is null or old_price >= price),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.profiles (
  id uuid primary key references auth.users(id) on update cascade on delete cascade,
  first_name text,
  last_name text,
  phone text,
  birth_date date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on update cascade on delete cascade,
  title text not null,
  recipient_name text not null,
  phone text not null,
  city text not null,
  district text not null,
  neighborhood text,
  postal_code text,
  address_line text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index addresses_one_default_per_user_idx on public.addresses(user_id) where is_default;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid not null references auth.users(id) on update cascade on delete restrict,
  status text not null check (status in ('received','paid','preparing','shipped','delivered','cancelled','returned')),
  payment_method text not null,
  payment_status text not null check (payment_status in ('pending','authorized','paid','failed','refunded')),
  delivery_method text not null,
  subtotal numeric(12,2) not null check (subtotal >= 0),
  discount_total numeric(12,2) not null default 0 check (discount_total >= 0),
  shipping_total numeric(12,2) not null default 0 check (shipping_total >= 0),
  tax_total numeric(12,2) not null default 0 check (tax_total >= 0),
  grand_total numeric(12,2) not null check (grand_total >= 0),
  delivery_address jsonb not null,
  billing_address jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on update cascade on delete cascade,
  product_id uuid references public.products(id) on update cascade on delete set null,
  variant_id uuid references public.product_variants(id) on update cascade on delete set null,
  product_name text not null,
  sku text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  discount_total numeric(12,2) not null default 0 check (discount_total >= 0),
  line_total numeric(12,2) not null check (line_total >= 0),
  product_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on update cascade on delete cascade,
  product_id uuid not null references public.products(id) on update cascade on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, product_id)
);

create index categories_active_sort_idx on public.categories(is_active, sort_order);
create index brands_active_name_idx on public.brands(is_active, name);
create index products_category_id_idx on public.products(category_id);
create index products_brand_id_idx on public.products(brand_id);
create index products_active_featured_idx on public.products(is_active, is_featured);
create index products_price_idx on public.products(price);
create index product_images_product_id_idx on public.product_images(product_id);
create index product_variants_product_id_idx on public.product_variants(product_id);
create index addresses_user_id_idx on public.addresses(user_id);
create index orders_user_created_idx on public.orders(user_id, created_at desc);
create index orders_status_idx on public.orders(status);
create index order_items_order_id_idx on public.order_items(order_id);
create index order_items_product_id_idx on public.order_items(product_id);
create index favorites_user_id_idx on public.favorites(user_id);
create index favorites_product_id_idx on public.favorites(product_id);

do $$
declare table_name text;
begin
  foreach table_name in array array['categories','brands','products','product_images','product_variants','profiles','addresses','orders','order_items','favorites']
  loop
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
  end loop;
end;
$$;

alter table public.categories enable row level security;
alter table public.brands enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;
alter table public.profiles enable row level security;
alter table public.addresses enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.favorites enable row level security;

create policy "Public can read active categories" on public.categories for select to anon, authenticated using (is_active);
create policy "Public can read active brands" on public.brands for select to anon, authenticated using (is_active);
create policy "Public can read active products" on public.products for select to anon, authenticated using (is_active);
create policy "Public can read images of active products" on public.product_images for select to anon, authenticated using (exists (select 1 from public.products where products.id = product_images.product_id and products.is_active));
create policy "Public can read active variants of active products" on public.product_variants for select to anon, authenticated using (is_active and exists (select 1 from public.products where products.id = product_variants.product_id and products.is_active));

create policy "Users can read own profile" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "Users can create own profile" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "Users can update own profile" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "Users can read own addresses" on public.addresses for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can create own addresses" on public.addresses for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update own addresses" on public.addresses for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete own addresses" on public.addresses for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Users can read own orders" on public.orders for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can read own order items" on public.order_items for select to authenticated using (exists (select 1 from public.orders where orders.id = order_items.order_id and orders.user_id = (select auth.uid())));

create policy "Users can read own favorites" on public.favorites for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can create own favorites" on public.favorites for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can delete own favorites" on public.favorites for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on all tables in schema public from anon, authenticated;
grant select on public.categories, public.brands, public.products, public.product_images, public.product_variants to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.addresses to authenticated;
grant select on public.orders, public.order_items to authenticated;
grant select, insert, delete on public.favorites to authenticated;

-- ============================================================================
-- SOURCE: supabase/migrations/202607240002_admin_product_crud.sql
-- ============================================================================
create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

grant execute on function public.is_admin() to authenticated;

create policy "Admins can read all categories"
on public.categories for select to authenticated
using ((select public.is_admin()));

create policy "Admins can read all brands"
on public.brands for select to authenticated
using ((select public.is_admin()));

create policy "Admins can read all products"
on public.products for select to authenticated
using ((select public.is_admin()));

create policy "Admins can create products"
on public.products for insert to authenticated
with check ((select public.is_admin()));

create policy "Admins can update products"
on public.products for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "Admins can read all product images"
on public.product_images for select to authenticated
using ((select public.is_admin()));

create policy "Admins can manage product images"
on public.product_images for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

grant insert, update on public.products to authenticated;
grant insert, update, delete on public.product_images to authenticated;

-- ============================================================================
-- SOURCE: supabase/migrations/202607240003_product_images_storage.sql
-- ============================================================================
alter table public.product_images
add column if not exists path text;

update public.product_images
set path = regexp_replace(url, '^.*/product-images/', '')
where path is null and url like '%/product-images/%';

create unique index if not exists product_images_path_unique_idx
on public.product_images(path)
where path is not null;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Public can view product images"
on storage.objects for select to anon, authenticated
using (bucket_id = 'product-images');

create policy "Admins can upload product images"
on storage.objects for insert to authenticated
with check (bucket_id = 'product-images' and (select public.is_admin()));

create policy "Admins can update product images"
on storage.objects for update to authenticated
using (bucket_id = 'product-images' and (select public.is_admin()))
with check (bucket_id = 'product-images' and (select public.is_admin()));

create policy "Admins can delete product images"
on storage.objects for delete to authenticated
using (bucket_id = 'product-images' and (select public.is_admin()));

-- ============================================================================
-- SOURCE: supabase/migrations/202607240004_admin_taxonomy_crud.sql
-- ============================================================================
alter table public.categories
add column if not exists image_url text;

create policy "Admins can create categories"
on public.categories for insert to authenticated
with check ((select public.is_admin()));

create policy "Admins can update categories"
on public.categories for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "Admins can create brands"
on public.brands for insert to authenticated
with check ((select public.is_admin()));

create policy "Admins can update brands"
on public.brands for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

grant insert, update on public.categories, public.brands to authenticated;

-- ============================================================================
-- SOURCE: supabase/migrations/202607240005_order_management.sql
-- ============================================================================
alter table public.orders alter column user_id drop not null;
alter table public.orders add column if not exists admin_note text;
alter table public.orders add column if not exists status_history jsonb not null default '[]'::jsonb;

create index if not exists orders_created_at_idx on public.orders(created_at desc);

create or replace function public.create_order(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id uuid;
  v_order_number text;
  v_item jsonb;
  v_product public.products%rowtype;
  v_subtotal numeric(12,2) := 0;
  v_discount numeric(12,2) := 0;
  v_shipping numeric(12,2) := 0;
  v_tax numeric(12,2) := 0;
  v_total numeric(12,2) := 0;
  v_quantity integer;
  v_coupon text := upper(coalesce(p_payload->>'coupon_code', ''));
  v_delivery text := p_payload->>'delivery_method';
  v_payment text := p_payload->>'payment_method';
begin
  if jsonb_typeof(p_payload->'items') <> 'array' or jsonb_array_length(p_payload->'items') = 0 then
    raise exception 'invalid_items';
  end if;
  if coalesce(p_payload->'delivery_address'->>'email', '') = '' or coalesce(p_payload->'delivery_address'->>'phone', '') = '' then
    raise exception 'invalid_contact';
  end if;
  if v_delivery not in ('standard','express','store') or v_payment not in ('card','transfer','cash') then
    raise exception 'invalid_method';
  end if;

  loop
    v_order_number := 'CG-' || extract(year from timezone('utc', now()))::text || '-' || lpad(floor(random() * 100000000)::bigint::text, 8, '0');
    exit when not exists (select 1 from public.orders where order_number = v_order_number);
  end loop;

  insert into public.orders (order_number, user_id, status, payment_method, payment_status, delivery_method, subtotal, discount_total, shipping_total, tax_total, grand_total, delivery_address, billing_address, status_history)
  values (v_order_number, auth.uid(), 'received', v_payment, 'pending', v_delivery, 0, 0, 0, 0, 0, p_payload->'delivery_address', p_payload->'billing_address', jsonb_build_array(jsonb_build_object('status','received','label','Sipariş alındı','at',timezone('utc', now()))))
  returning id into v_order_id;

  for v_item in select value from jsonb_array_elements(p_payload->'items') loop
    v_quantity := (v_item->>'quantity')::integer;
    if v_quantity < 1 or v_quantity > 10 then raise exception 'invalid_quantity'; end if;
    select * into v_product from public.products where sku = v_item->>'sku' and is_active limit 1;
    if not found or v_product.stock_quantity < v_quantity then raise exception 'product_unavailable'; end if;
    v_subtotal := v_subtotal + (v_product.price * v_quantity);
    insert into public.order_items (order_id, product_id, product_name, sku, quantity, unit_price, discount_total, line_total, product_snapshot)
    values (v_order_id, v_product.id, v_product.name, v_product.sku, v_quantity, v_product.price, 0, v_product.price * v_quantity, jsonb_build_object('slug',v_product.slug,'image_url',v_item->>'image_url'));
  end loop;

  if v_coupon = 'CENTER10' then v_discount := round(v_subtotal * 0.10, 2); end if;
  v_shipping := case when v_delivery = 'express' then 199 when v_subtotal < 2500 and v_delivery = 'standard' then 149 else 0 end;
  v_total := greatest(0, v_subtotal - v_discount + v_shipping);
  v_tax := round(v_total - (v_total / 1.20), 2);
  update public.orders set subtotal=v_subtotal, discount_total=v_discount, shipping_total=v_shipping, tax_total=v_tax, grand_total=v_total where id=v_order_id;
  return jsonb_build_object('id',v_order_id,'order_number',v_order_number,'grand_total',v_total,'created_at',timezone('utc', now()));
end;
$$;

create or replace function public.get_order_by_reference(p_order_number text, p_contact text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'order', to_jsonb(o),
    'items', coalesce((select jsonb_agg(to_jsonb(oi) order by oi.created_at) from public.order_items oi where oi.order_id=o.id), '[]'::jsonb)
  )
  from public.orders o
  where upper(o.order_number)=upper(trim(p_order_number))
    and (
      lower(o.delivery_address->>'email')=lower(trim(p_contact))
      or regexp_replace(o.delivery_address->>'phone','\D','','g')=regexp_replace(p_contact,'\D','','g')
      or (o.user_id is not null and o.user_id=auth.uid())
    )
  limit 1;
$$;

create or replace function public.admin_update_order(p_order_id uuid, p_status text, p_payment_status text, p_note text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare v_history jsonb; v_current text;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if p_status not in ('received','preparing','shipped','delivered','cancelled') then raise exception 'invalid_status'; end if;
  if p_payment_status not in ('pending','paid','refunded') then raise exception 'invalid_payment_status'; end if;
  select status, status_history into v_current, v_history from public.orders where id=p_order_id for update;
  if not found then return false; end if;
  if v_current <> p_status then
    v_history := coalesce(v_history,'[]'::jsonb) || jsonb_build_array(jsonb_build_object('status',p_status,'label',case p_status when 'received' then 'Sipariş alındı' when 'preparing' then 'Hazırlanıyor' when 'shipped' then 'Kargoya verildi' when 'delivered' then 'Teslim edildi' else 'İptal edildi' end,'at',timezone('utc', now())));
  end if;
  update public.orders set status=p_status, payment_status=p_payment_status, admin_note=nullif(trim(p_note),''), status_history=v_history where id=p_order_id;
  return true;
end;
$$;

create policy "Admins can read all orders" on public.orders for select to authenticated using ((select public.is_admin()));
create policy "Admins can update orders" on public.orders for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins can read all order items" on public.order_items for select to authenticated using ((select public.is_admin()));
grant select, update on public.orders to authenticated;
grant select on public.order_items to authenticated;
revoke all on function public.create_order(jsonb) from public;
revoke all on function public.get_order_by_reference(text,text) from public;
revoke all on function public.admin_update_order(uuid,text,text,text) from public;
grant execute on function public.create_order(jsonb) to anon, authenticated;
grant execute on function public.get_order_by_reference(text,text) to anon, authenticated;
grant execute on function public.admin_update_order(uuid,text,text,text) to authenticated;

-- ============================================================================
-- SOURCE: supabase/migrations/202607240006_supabase_auth_accounts.sql
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, first_name, last_name, phone)
  values (
    new.id,
    nullif(trim(new.raw_user_meta_data->>'first_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'last_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'phone'), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

insert into public.profiles (id, first_name, last_name, phone)
select id, nullif(trim(raw_user_meta_data->>'first_name'), ''), nullif(trim(raw_user_meta_data->>'last_name'), ''), nullif(trim(raw_user_meta_data->>'phone'), '')
from auth.users
on conflict (id) do nothing;

-- ============================================================================
-- SOURCE: supabase/migrations/202607240007_promotions_and_coupons.sql
-- ============================================================================
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  slug text not null unique check (slug = lower(slug)),
  description text,
  discount_type text not null check (discount_type in ('percentage','fixed')),
  discount_value numeric(12,2) not null check (discount_value > 0),
  minimum_order_amount numeric(12,2) not null default 0 check (minimum_order_amount >= 0),
  maximum_discount_amount numeric(12,2) check (maximum_discount_amount is null or maximum_discount_amount > 0),
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  is_active boolean not null default true,
  category_id uuid references public.categories(id) on update cascade on delete restrict,
  brand_id uuid references public.brands(id) on update cascade on delete restrict,
  product_id uuid references public.products(id) on update cascade on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (discount_type <> 'percentage' or discount_value <= 100),
  check (num_nonnulls(category_id, brand_id, product_id) <= 1)
);

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(code) and length(trim(code)) > 0),
  description text,
  discount_type text not null check (discount_type in ('percentage','fixed')),
  discount_value numeric(12,2) not null check (discount_value > 0),
  minimum_order_amount numeric(12,2) not null default 0 check (minimum_order_amount >= 0),
  maximum_discount_amount numeric(12,2) check (maximum_discount_amount is null or maximum_discount_amount > 0),
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  usage_limit_per_user integer check (usage_limit_per_user is null or usage_limit_per_user > 0),
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (discount_type <> 'percentage' or discount_value <= 100)
);

create table public.coupon_usages (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on update cascade on delete restrict,
  user_id uuid references auth.users(id) on update cascade on delete set null,
  order_id uuid not null unique references public.orders(id) on update cascade on delete cascade,
  used_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.orders add column if not exists coupon_snapshot jsonb;
alter table public.orders add column if not exists campaign_snapshots jsonb not null default '[]'::jsonb;

create index campaigns_active_dates_idx on public.campaigns(is_active, starts_at, ends_at);
create index campaigns_category_idx on public.campaigns(category_id) where category_id is not null;
create index campaigns_brand_idx on public.campaigns(brand_id) where brand_id is not null;
create index campaigns_product_idx on public.campaigns(product_id) where product_id is not null;
create index coupons_active_dates_idx on public.coupons(is_active, starts_at, ends_at);
create index coupon_usages_coupon_idx on public.coupon_usages(coupon_id);
create index coupon_usages_user_idx on public.coupon_usages(user_id) where user_id is not null;

create trigger set_campaigns_updated_at before update on public.campaigns for each row execute function public.set_updated_at();
create trigger set_coupons_updated_at before update on public.coupons for each row execute function public.set_updated_at();
create trigger set_coupon_usages_updated_at before update on public.coupon_usages for each row execute function public.set_updated_at();

alter table public.campaigns enable row level security;
alter table public.coupons enable row level security;
alter table public.coupon_usages enable row level security;

create policy "Public can read active campaigns" on public.campaigns for select to anon, authenticated
  using (is_active and starts_at <= timezone('utc', now()) and ends_at >= timezone('utc', now()));
create policy "Admins can read all campaigns" on public.campaigns for select to authenticated using ((select public.is_admin()));
create policy "Admins can create campaigns" on public.campaigns for insert to authenticated with check ((select public.is_admin()));
create policy "Admins can update campaigns" on public.campaigns for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins can delete campaigns" on public.campaigns for delete to authenticated using ((select public.is_admin()));
create policy "Admins can manage coupons" on public.coupons for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Users can read own coupon usages" on public.coupon_usages for select to authenticated using ((select auth.uid()) = user_id);
create policy "Admins can read coupon usages" on public.coupon_usages for select to authenticated using ((select public.is_admin()));

revoke all on public.campaigns, public.coupons, public.coupon_usages from anon, authenticated;
grant select on public.campaigns to anon, authenticated;
grant select, insert, update, delete on public.campaigns, public.coupons to authenticated;
grant select on public.coupon_usages to authenticated;

create or replace function public.compute_order_pricing(p_items jsonb, p_coupon_code text, p_lock_coupon boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item jsonb; v_product public.products%rowtype; v_campaign public.campaigns%rowtype; v_coupon public.coupons%rowtype;
  v_quantity integer; v_line numeric(12,2); v_line_discount numeric(12,2); v_subtotal numeric(12,2) := 0;
  v_campaign_discount numeric(12,2) := 0; v_coupon_discount numeric(12,2) := 0; v_remaining numeric(12,2);
  v_lines jsonb := '[]'::jsonb; v_campaigns jsonb := '[]'::jsonb; v_code text := upper(trim(coalesce(p_coupon_code,'')));
  v_total_usage integer; v_user_usage integer;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'invalid_items'; end if;
  for v_item in select value from jsonb_array_elements(p_items) loop
    v_quantity := (v_item->>'quantity')::integer;
    if v_quantity < 1 or v_quantity > 10 then raise exception 'invalid_quantity'; end if;
    select * into v_product from public.products where sku = v_item->>'sku' and is_active limit 1;
    if not found or v_product.stock_quantity < v_quantity then raise exception 'product_unavailable'; end if;
    v_line := round(v_product.price * v_quantity, 2); v_subtotal := v_subtotal + v_line;
    v_lines := v_lines || jsonb_build_array(jsonb_build_object('product_id',v_product.id,'name',v_product.name,'slug',v_product.slug,'sku',v_product.sku,'quantity',v_quantity,'unit_price',v_product.price,'line_subtotal',v_line,'image_url',v_item->>'image_url'));
  end loop;
  for v_item in select value from jsonb_array_elements(v_lines) loop
    select * into v_product from public.products where id=(v_item->>'product_id')::uuid;
    select c.* into v_campaign from public.campaigns c
      where c.is_active and c.starts_at <= timezone('utc',now()) and c.ends_at >= timezone('utc',now())
        and c.minimum_order_amount <= v_subtotal
        and (c.product_id is null or c.product_id=v_product.id)
        and (c.category_id is null or c.category_id=v_product.category_id)
        and (c.brand_id is null or c.brand_id=v_product.brand_id)
      order by least((v_item->>'line_subtotal')::numeric,
        case when c.discount_type='percentage' then (v_item->>'line_subtotal')::numeric*c.discount_value/100 else c.discount_value end,
        coalesce(c.maximum_discount_amount, (v_item->>'line_subtotal')::numeric)) desc, c.created_at
      limit 1;
    if found then
      v_line_discount := round(least((v_item->>'line_subtotal')::numeric,
        case when v_campaign.discount_type='percentage' then (v_item->>'line_subtotal')::numeric*v_campaign.discount_value/100 else v_campaign.discount_value end,
        coalesce(v_campaign.maximum_discount_amount,(v_item->>'line_subtotal')::numeric)),2);
      v_campaign_discount := v_campaign_discount + v_line_discount;
      v_campaigns := v_campaigns || jsonb_build_array(jsonb_build_object('id',v_campaign.id,'name',v_campaign.name,'slug',v_campaign.slug,'discount_type',v_campaign.discount_type,'discount_value',v_campaign.discount_value,'product_id',v_product.id,'amount',v_line_discount));
    end if;
  end loop;
  v_remaining := greatest(0, v_subtotal-v_campaign_discount);
  if v_code <> '' then
    if p_lock_coupon then select * into v_coupon from public.coupons where code=v_code for update;
    else select * into v_coupon from public.coupons where code=v_code; end if;
    if not found or not v_coupon.is_active or v_coupon.starts_at > timezone('utc',now()) or v_coupon.ends_at < timezone('utc',now()) then raise exception 'coupon_invalid'; end if;
    if v_remaining < v_coupon.minimum_order_amount then raise exception 'coupon_minimum'; end if;
    select count(*) into v_total_usage from public.coupon_usages where coupon_id=v_coupon.id;
    if v_coupon.usage_limit is not null and v_total_usage >= v_coupon.usage_limit then raise exception 'coupon_limit'; end if;
    if v_coupon.usage_limit_per_user is not null then
      if auth.uid() is null then raise exception 'coupon_login_required'; end if;
      select count(*) into v_user_usage from public.coupon_usages where coupon_id=v_coupon.id and user_id=auth.uid();
      if v_user_usage >= v_coupon.usage_limit_per_user then raise exception 'coupon_user_limit'; end if;
    end if;
    v_coupon_discount := round(least(v_remaining,
      case when v_coupon.discount_type='percentage' then v_remaining*v_coupon.discount_value/100 else v_coupon.discount_value end,
      coalesce(v_coupon.maximum_discount_amount,v_remaining)),2);
  end if;
  return jsonb_build_object('subtotal',v_subtotal,'campaign_discount',v_campaign_discount,'coupon_discount',v_coupon_discount,'discount_total',least(v_subtotal,v_campaign_discount+v_coupon_discount),'payable_subtotal',greatest(0,v_subtotal-v_campaign_discount-v_coupon_discount),'items',v_lines,'campaigns',v_campaigns,'coupon',case when v_code='' then null else jsonb_build_object('id',v_coupon.id,'code',v_coupon.code,'description',v_coupon.description,'discount_type',v_coupon.discount_type,'discount_value',v_coupon.discount_value,'amount',v_coupon_discount) end);
end;
$$;

create or replace function public.calculate_checkout_pricing(p_items jsonb, p_coupon_code text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin return public.compute_order_pricing(p_items,p_coupon_code,false);
exception when others then return jsonb_build_object('valid',false,'error','promotion_invalid'); end;
$$;

create or replace function public.create_order(p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_order_id uuid; v_order_number text; v_item jsonb; v_pricing jsonb; v_shipping numeric(12,2); v_total numeric(12,2); v_tax numeric(12,2);
  v_delivery text := p_payload->>'delivery_method'; v_payment text := p_payload->>'payment_method';
begin
  if coalesce(p_payload->'delivery_address'->>'email','')='' or coalesce(p_payload->'delivery_address'->>'phone','')='' then raise exception 'invalid_contact'; end if;
  if v_delivery not in ('standard','express','store') or v_payment not in ('card','transfer','cash') then raise exception 'invalid_method'; end if;
  v_pricing := public.compute_order_pricing(p_payload->'items',p_payload->>'coupon_code',true);
  loop v_order_number := 'CG-'||extract(year from timezone('utc',now()))::text||'-'||lpad(floor(random()*100000000)::bigint::text,8,'0'); exit when not exists(select 1 from public.orders where order_number=v_order_number); end loop;
  v_shipping := case when v_delivery='express' then 199 when (v_pricing->>'payable_subtotal')::numeric<2500 and v_delivery='standard' then 149 else 0 end;
  v_total := greatest(0,(v_pricing->>'payable_subtotal')::numeric+v_shipping); v_tax := round(v_total-(v_total/1.20),2);
  insert into public.orders(order_number,user_id,status,payment_method,payment_status,delivery_method,subtotal,discount_total,shipping_total,tax_total,grand_total,delivery_address,billing_address,status_history,coupon_snapshot,campaign_snapshots)
  values(v_order_number,auth.uid(),'received',v_payment,'pending',v_delivery,(v_pricing->>'subtotal')::numeric,(v_pricing->>'discount_total')::numeric,v_shipping,v_tax,v_total,p_payload->'delivery_address',p_payload->'billing_address',jsonb_build_array(jsonb_build_object('status','received','label','Sipariş alındı','at',timezone('utc',now()))),v_pricing->'coupon',v_pricing->'campaigns') returning id into v_order_id;
  for v_item in select value from jsonb_array_elements(v_pricing->'items') loop
    insert into public.order_items(order_id,product_id,product_name,sku,quantity,unit_price,discount_total,line_total,product_snapshot)
    values(v_order_id,(v_item->>'product_id')::uuid,v_item->>'name',v_item->>'sku',(v_item->>'quantity')::integer,(v_item->>'unit_price')::numeric,0,(v_item->>'line_subtotal')::numeric,jsonb_build_object('slug',v_item->>'slug','image_url',v_item->>'image_url'));
  end loop;
  if v_pricing->'coupon' is not null then insert into public.coupon_usages(coupon_id,user_id,order_id) values((v_pricing->'coupon'->>'id')::uuid,auth.uid(),v_order_id); end if;
  return jsonb_build_object('id',v_order_id,'order_number',v_order_number,'grand_total',v_total,'subtotal',(v_pricing->>'subtotal')::numeric,'discount_total',(v_pricing->>'discount_total')::numeric,'campaign_discount',(v_pricing->>'campaign_discount')::numeric,'coupon_discount',(v_pricing->>'coupon_discount')::numeric,'created_at',timezone('utc',now()));
end;
$$;

revoke all on function public.compute_order_pricing(jsonb,text,boolean) from public;
revoke all on function public.calculate_checkout_pricing(jsonb,text) from public;
revoke all on function public.create_order(jsonb) from public;
grant execute on function public.calculate_checkout_pricing(jsonb,text) to anon, authenticated;
grant execute on function public.create_order(jsonb) to anon, authenticated;

-- ============================================================================
-- SOURCE: supabase/migrations/202607240008_payment_foundation.sql
-- ============================================================================
create table public.payment_accounts (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'manual_bank_transfer' check (provider = 'manual_bank_transfer'),
  bank_name text not null check (length(trim(bank_name)) > 0),
  account_holder text not null check (length(trim(account_holder)) > 0),
  iban text not null unique check (iban ~ '^TR[0-9]{24}$'),
  branch text,
  description text,
  is_active boolean not null default true,
  is_default boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on update cascade on delete cascade,
  payment_account_id uuid references public.payment_accounts(id) on update cascade on delete set null,
  provider text not null,
  transaction_type text not null default 'payment' check (transaction_type in ('payment','cancel','refund')),
  status text not null check (status in ('pending','awaiting_payment','paid','failed','cancelled','refunded')),
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'TRY' check (currency = 'TRY'),
  reference text not null,
  provider_reference text,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.orders add column if not exists expected_payment numeric(12,2) not null default 0 check (expected_payment >= 0);
alter table public.orders add column if not exists payment_note text;
alter table public.orders add column if not exists payment_account_snapshot jsonb;

create unique index payment_accounts_one_default_idx on public.payment_accounts(is_default) where is_default and is_active;
create index payment_accounts_active_idx on public.payment_accounts(is_active, is_default);
create index payment_transactions_order_idx on public.payment_transactions(order_id, created_at desc);
create index payment_transactions_status_idx on public.payment_transactions(status);
create unique index payment_transactions_initial_payment_idx on public.payment_transactions(order_id) where transaction_type='payment';

create trigger set_payment_accounts_updated_at before update on public.payment_accounts for each row execute function public.set_updated_at();
create trigger set_payment_transactions_updated_at before update on public.payment_transactions for each row execute function public.set_updated_at();

alter table public.payment_accounts enable row level security;
alter table public.payment_transactions enable row level security;
create policy "Public can read active payment accounts" on public.payment_accounts for select to anon, authenticated using (is_active);
create policy "Admins can read all payment accounts" on public.payment_accounts for select to authenticated using ((select public.is_admin()));
create policy "Admins can create payment accounts" on public.payment_accounts for insert to authenticated with check ((select public.is_admin()));
create policy "Admins can update payment accounts" on public.payment_accounts for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins can delete payment accounts" on public.payment_accounts for delete to authenticated using ((select public.is_admin()));
create policy "Users can read own payment transactions" on public.payment_transactions for select to authenticated using (exists(select 1 from public.orders o where o.id=order_id and o.user_id=(select auth.uid())));
create policy "Admins can read payment transactions" on public.payment_transactions for select to authenticated using ((select public.is_admin()));
create policy "Admins can update payment transactions" on public.payment_transactions for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

revoke all on public.payment_accounts, public.payment_transactions from anon, authenticated;
grant select on public.payment_accounts to anon, authenticated;
grant select, insert, update, delete on public.payment_accounts to authenticated;
grant select, update on public.payment_transactions to authenticated;

create or replace function public.prepare_order_payment()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_account public.payment_accounts%rowtype;
begin
  new.expected_payment := new.grand_total;
  if new.payment_method='transfer' then
    select * into v_account from public.payment_accounts where is_active order by is_default desc, created_at limit 1;
    if not found then raise exception 'bank_account_unavailable'; end if;
    new.payment_status := 'awaiting_payment';
    new.payment_note := 'Havale açıklamasına sipariş numarasını yazınız: '||new.order_number;
    new.payment_account_snapshot := jsonb_build_object('id',v_account.id,'provider',v_account.provider,'bank_name',v_account.bank_name,'account_holder',v_account.account_holder,'iban',v_account.iban,'branch',v_account.branch,'description',v_account.description);
  elsif new.payment_method='cash' then
    new.payment_status := 'pending'; new.payment_note := 'Ödeme teslimat sırasında tahsil edilecektir.'; new.payment_account_snapshot := null;
  elsif new.payment_method='card' then
    raise exception 'payment_method_unavailable';
  end if;
  return new;
end;
$$;

create trigger prepare_order_payment_before_insert before insert on public.orders for each row execute function public.prepare_order_payment();

create or replace function public.record_initial_payment()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.payment_transactions(order_id,payment_account_id,provider,status,amount,reference,note,metadata)
  values(new.id,case when new.payment_account_snapshot is null then null else (new.payment_account_snapshot->>'id')::uuid end,case when new.payment_method='transfer' then 'manual_bank_transfer' else 'cash_on_delivery' end,new.payment_status,new.expected_payment,new.order_number,new.payment_note,jsonb_build_object('payment_method',new.payment_method));
  return new;
end;
$$;
create trigger record_initial_payment_after_insert after insert on public.orders for each row execute function public.record_initial_payment();

create or replace function public.admin_set_default_payment_account(p_account_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if not exists(select 1 from public.payment_accounts where id=p_account_id and is_active) then return false; end if;
  update public.payment_accounts set is_default=false where is_default;
  update public.payment_accounts set is_default=true where id=p_account_id;
  return true;
end;
$$;

create or replace function public.admin_update_order(p_order_id uuid, p_status text, p_payment_status text, p_note text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_history jsonb; v_current text; v_current_payment text;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if p_status not in ('received','preparing','shipped','delivered','cancelled') then raise exception 'invalid_status'; end if;
  if p_payment_status not in ('pending','awaiting_payment','paid','failed','cancelled','refunded') then raise exception 'invalid_payment_status'; end if;
  select status,payment_status,status_history into v_current,v_current_payment,v_history from public.orders where id=p_order_id for update;
  if not found then return false; end if;
  if v_current<>p_status then v_history:=coalesce(v_history,'[]'::jsonb)||jsonb_build_array(jsonb_build_object('status',p_status,'label',case p_status when 'received' then 'Sipariş alındı' when 'preparing' then 'Hazırlanıyor' when 'shipped' then 'Kargoya verildi' when 'delivered' then 'Teslim edildi' else 'İptal edildi' end,'at',timezone('utc',now()))); end if;
  if v_current_payment<>p_payment_status then v_history:=coalesce(v_history,'[]'::jsonb)||jsonb_build_array(jsonb_build_object('status','payment:'||p_payment_status,'label',case p_payment_status when 'pending' then 'Ödeme bekliyor' when 'awaiting_payment' then 'Havale bekleniyor' when 'paid' then 'Ödeme alındı' when 'failed' then 'Ödeme başarısız' when 'cancelled' then 'Ödeme iptal edildi' else 'Ödeme iade edildi' end,'at',timezone('utc',now()))); end if;
  update public.orders set status=p_status,payment_status=p_payment_status,admin_note=nullif(trim(p_note),''),status_history=v_history where id=p_order_id;
  update public.payment_transactions set status=p_payment_status,note=coalesce(nullif(trim(p_note),''),note) where order_id=p_order_id and transaction_type='payment';
  return true;
end;
$$;

revoke all on function public.admin_set_default_payment_account(uuid) from public;
revoke all on function public.admin_update_order(uuid,text,text,text) from public;
grant execute on function public.admin_set_default_payment_account(uuid) to authenticated;
grant execute on function public.admin_update_order(uuid,text,text,text) to authenticated;

-- ============================================================================
-- SOURCE: supabase/migrations/202607250001_inventory_and_warehouses.sql
-- ============================================================================
create table public.warehouses (
  id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name))>0), code text not null unique check(code=upper(code)),
  description text, address text, is_default boolean not null default false, is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc',now()), updated_at timestamptz not null default timezone('utc',now())
);
create unique index warehouses_one_active_default_idx on public.warehouses(is_default) where is_default and is_active;

create table public.inventory (
  id uuid primary key default gen_random_uuid(), warehouse_id uuid not null references public.warehouses(id) on update cascade on delete restrict,
  product_id uuid not null references public.products(id) on update cascade on delete restrict,
  quantity_on_hand integer not null default 0 check(quantity_on_hand>=0), quantity_reserved integer not null default 0 check(quantity_reserved>=0 and quantity_reserved<=quantity_on_hand),
  reorder_level integer not null default 5 check(reorder_level>=0), created_at timestamptz not null default timezone('utc',now()), updated_at timestamptz not null default timezone('utc',now()),
  unique(warehouse_id,product_id)
);
create index inventory_product_idx on public.inventory(product_id); create index inventory_warehouse_idx on public.inventory(warehouse_id);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(), warehouse_id uuid not null references public.warehouses(id) on update cascade on delete restrict,
  product_id uuid not null references public.products(id) on update cascade on delete restrict,
  movement_type text not null check(movement_type in ('initial_stock','manual_increase','manual_decrease','order_reservation','order_sale','reservation_release','order_cancel_return','customer_return','stock_correction')),
  quantity integer not null check(quantity<>0), quantity_before integer not null check(quantity_before>=0), quantity_after integer not null check(quantity_after>=0),
  order_id uuid references public.orders(id) on update cascade on delete set null, reference text, note text not null, created_by uuid references auth.users(id) on update cascade on delete set null,
  created_at timestamptz not null default timezone('utc',now())
);
create index inventory_movements_product_date_idx on public.inventory_movements(product_id,created_at desc);
create index inventory_movements_warehouse_date_idx on public.inventory_movements(warehouse_id,created_at desc);
create index inventory_movements_order_idx on public.inventory_movements(order_id) where order_id is not null;

create table public.inventory_reservations (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on update cascade on delete cascade,
  order_item_id uuid not null unique references public.order_items(id) on update cascade on delete cascade,
  warehouse_id uuid not null references public.warehouses(id) on update cascade on delete restrict,
  product_id uuid not null references public.products(id) on update cascade on delete restrict,
  quantity integer not null check(quantity>0), status text not null default 'active' check(status in ('active','completed','released','expired')),
  expires_at timestamptz not null default (timezone('utc',now())+interval '30 minutes'), created_at timestamptz not null default timezone('utc',now()),
  released_at timestamptz, completed_at timestamptz, updated_at timestamptz not null default timezone('utc',now())
);
create index inventory_reservations_order_idx on public.inventory_reservations(order_id,status);
create index inventory_reservations_expiry_idx on public.inventory_reservations(expires_at) where status='active';

create trigger set_warehouses_updated_at before update on public.warehouses for each row execute function public.set_updated_at();
create trigger set_inventory_updated_at before update on public.inventory for each row execute function public.set_updated_at();
create trigger set_inventory_reservations_updated_at before update on public.inventory_reservations for each row execute function public.set_updated_at();

insert into public.warehouses(id,name,code,description,is_default,is_active)
select '30000000-0000-4000-8000-000000000001','CENTER GSM Ana Depo','MAIN','Sistem tarafından oluşturulan varsayılan depo',true,true
where not exists(select 1 from public.warehouses where code='MAIN');
update public.warehouses set is_default=true where id=(select id from public.warehouses where is_active order by is_default desc,created_at limit 1)
  and not exists(select 1 from public.warehouses where is_active and is_default);

insert into public.inventory(warehouse_id,product_id,quantity_on_hand,quantity_reserved,reorder_level)
select w.id,p.id,greatest(0,p.stock_quantity),0,5 from public.products p cross join lateral(select id from public.warehouses where is_active order by is_default desc,created_at limit 1) w
on conflict(warehouse_id,product_id) do nothing;
insert into public.inventory_movements(warehouse_id,product_id,movement_type,quantity,quantity_before,quantity_after,reference,note)
select i.warehouse_id,i.product_id,'initial_stock',i.quantity_on_hand,0,i.quantity_on_hand,'MIGRATION-202607250001','Mevcut ürün stoğu varsayılan depoya taşındı'
from public.inventory i where i.quantity_on_hand>0 and not exists(select 1 from public.inventory_movements m where m.warehouse_id=i.warehouse_id and m.product_id=i.product_id and m.movement_type='initial_stock');

create or replace view public.product_available_stock as
select p.id as product_id,coalesce(sum(i.quantity_on_hand-i.quantity_reserved),0)::integer as available_stock
from public.products p left join public.inventory i on i.product_id=p.id left join public.warehouses w on w.id=i.warehouse_id and w.is_active
where p.is_active group by p.id;

alter table public.warehouses enable row level security; alter table public.inventory enable row level security;
alter table public.inventory_movements enable row level security; alter table public.inventory_reservations enable row level security;
create policy "Admins manage warehouses" on public.warehouses for all to authenticated using((select public.is_admin())) with check((select public.is_admin()));
create policy "Admins read inventory" on public.inventory for select to authenticated using((select public.is_admin()));
create policy "Admins read inventory movements" on public.inventory_movements for select to authenticated using((select public.is_admin()));
create policy "Admins read reservations" on public.inventory_reservations for select to authenticated using((select public.is_admin()));
create policy "Users read own reservations" on public.inventory_reservations for select to authenticated using(exists(select 1 from public.orders o where o.id=order_id and o.user_id=(select auth.uid())));
revoke all on public.warehouses,public.inventory,public.inventory_movements,public.inventory_reservations from anon,authenticated;
grant select,insert,update,delete on public.warehouses to authenticated; grant select on public.inventory,public.inventory_movements,public.inventory_reservations to authenticated;
grant select on public.product_available_stock to anon,authenticated;

create or replace function public.sync_product_stock_from_inventory() returns trigger language plpgsql security definer set search_path='' as $$
begin update public.products set stock_quantity=coalesce((select sum(i.quantity_on_hand-i.quantity_reserved) from public.inventory i join public.warehouses w on w.id=i.warehouse_id where i.product_id=case when tg_op='DELETE' then old.product_id else new.product_id end and w.is_active),0) where id=case when tg_op='DELETE' then old.product_id else new.product_id end; if tg_op='DELETE' then return old; end if; return new; end; $$;
create trigger sync_product_stock_after_inventory after insert or update or delete on public.inventory for each row execute function public.sync_product_stock_from_inventory();

create or replace function public.protect_direct_product_stock_update() returns trigger language plpgsql set search_path='' as $$
begin if new.stock_quantity<>old.stock_quantity and pg_trigger_depth()=1 then raise exception 'direct_stock_update_forbidden'; end if; return new; end; $$;
create trigger protect_product_stock before update of stock_quantity on public.products for each row execute function public.protect_direct_product_stock_update();

create or replace function public.initialize_product_inventory() returns trigger language plpgsql security definer set search_path='' as $$
declare v_warehouse uuid; v_quantity integer:=greatest(0,new.stock_quantity);
begin select id into v_warehouse from public.warehouses where is_active order by is_default desc,created_at limit 1; if v_warehouse is null then raise exception 'warehouse_unavailable'; end if;
insert into public.inventory(warehouse_id,product_id,quantity_on_hand) values(v_warehouse,new.id,v_quantity);
if v_quantity>0 then insert into public.inventory_movements(warehouse_id,product_id,movement_type,quantity,quantity_before,quantity_after,reference,note,created_by) values(v_warehouse,new.id,'initial_stock',v_quantity,0,v_quantity,'PRODUCT-CREATE','Yeni ürün başlangıç stoğu',auth.uid()); end if; return new; end; $$;
create trigger initialize_product_inventory_after_insert after insert on public.products for each row execute function public.initialize_product_inventory();

create or replace function public.reserve_order_item_inventory() returns trigger language plpgsql security definer set search_path='' as $$
declare v_inventory public.inventory%rowtype; v_before integer;
begin select i.* into v_inventory from public.inventory i join public.warehouses w on w.id=i.warehouse_id where i.product_id=new.product_id and w.is_active order by w.is_default desc,(i.quantity_on_hand-i.quantity_reserved) desc for update of i limit 1;
if not found or v_inventory.quantity_on_hand-v_inventory.quantity_reserved<new.quantity then raise exception 'insufficient_inventory'; end if;
v_before:=v_inventory.quantity_on_hand-v_inventory.quantity_reserved; update public.inventory set quantity_reserved=quantity_reserved+new.quantity where id=v_inventory.id;
insert into public.inventory_reservations(order_id,order_item_id,warehouse_id,product_id,quantity) values(new.order_id,new.id,v_inventory.warehouse_id,new.product_id,new.quantity);
insert into public.inventory_movements(warehouse_id,product_id,movement_type,quantity,quantity_before,quantity_after,order_id,reference,note) values(v_inventory.warehouse_id,new.product_id,'order_reservation',-new.quantity,v_before,v_before-new.quantity,new.order_id,'ORDER-'||new.order_id,'Sipariş için stok rezerve edildi'); return new; end; $$;
create trigger reserve_inventory_after_order_item after insert on public.order_items for each row when(new.product_id is not null) execute function public.reserve_order_item_inventory();

create or replace function public.complete_order_inventory(p_order_id uuid) returns boolean language plpgsql security definer set search_path='' as $$
declare r public.inventory_reservations%rowtype; i public.inventory%rowtype;
begin for r in select * from public.inventory_reservations where order_id=p_order_id and status='active' order by id for update loop select * into i from public.inventory where warehouse_id=r.warehouse_id and product_id=r.product_id for update; if i.quantity_reserved<r.quantity or i.quantity_on_hand<r.quantity then raise exception 'inventory_inconsistent'; end if;
update public.inventory set quantity_on_hand=quantity_on_hand-r.quantity,quantity_reserved=quantity_reserved-r.quantity where id=i.id;
update public.inventory_reservations set status='completed',completed_at=timezone('utc',now()) where id=r.id;
insert into public.inventory_movements(warehouse_id,product_id,movement_type,quantity,quantity_before,quantity_after,order_id,reference,note,created_by) values(r.warehouse_id,r.product_id,'order_sale',-r.quantity,i.quantity_on_hand,i.quantity_on_hand-r.quantity,p_order_id,'ORDER-'||p_order_id,'Sipariş satışı stoktan düşüldü',auth.uid()); end loop; return true; end; $$;

create or replace function public.release_order_inventory(p_order_id uuid,p_restore_completed boolean,p_customer_return boolean default false) returns boolean language plpgsql security definer set search_path='' as $$
declare r public.inventory_reservations%rowtype; i public.inventory%rowtype;
begin for r in select * from public.inventory_reservations where order_id=p_order_id and (status='active' or (status='completed' and p_restore_completed)) order by id for update loop select * into i from public.inventory where warehouse_id=r.warehouse_id and product_id=r.product_id for update;
if r.status='active' then update public.inventory set quantity_reserved=quantity_reserved-r.quantity where id=i.id; update public.inventory_reservations set status='released',released_at=timezone('utc',now()) where id=r.id;
insert into public.inventory_movements(warehouse_id,product_id,movement_type,quantity,quantity_before,quantity_after,order_id,reference,note,created_by) values(r.warehouse_id,r.product_id,'reservation_release',r.quantity,i.quantity_on_hand-i.quantity_reserved,i.quantity_on_hand-i.quantity_reserved+r.quantity,p_order_id,'ORDER-'||p_order_id,'Sipariş rezervasyonu serbest bırakıldı',auth.uid());
else update public.inventory set quantity_on_hand=quantity_on_hand+r.quantity where id=i.id; update public.inventory_reservations set status='released',released_at=timezone('utc',now()) where id=r.id;
insert into public.inventory_movements(warehouse_id,product_id,movement_type,quantity,quantity_before,quantity_after,order_id,reference,note,created_by) values(r.warehouse_id,r.product_id,case when p_customer_return then 'customer_return' else 'order_cancel_return' end,r.quantity,i.quantity_on_hand,i.quantity_on_hand+r.quantity,p_order_id,'ORDER-'||p_order_id,case when p_customer_return then 'Müşteri iadesi stoğa eklendi' else 'İptal edilen sipariş stoğa geri eklendi' end,auth.uid()); end if; end loop; return true; end; $$;

create or replace function public.adjust_inventory(p_warehouse_id uuid,p_product_id uuid,p_movement_type text,p_quantity integer,p_note text) returns boolean language plpgsql security definer set search_path='' as $$
declare i public.inventory%rowtype; v_after integer;
begin if not public.is_admin() then raise exception 'forbidden'; end if; if p_movement_type not in('manual_increase','manual_decrease','stock_correction') or p_quantity=0 or length(trim(p_note))<3 then raise exception 'invalid_adjustment'; end if;
select * into i from public.inventory where warehouse_id=p_warehouse_id and product_id=p_product_id for update; if not found then insert into public.inventory(warehouse_id,product_id) values(p_warehouse_id,p_product_id) returning * into i; end if;
v_after:=case when p_movement_type='stock_correction' then p_quantity else i.quantity_on_hand+case when p_movement_type='manual_increase' then abs(p_quantity) else -abs(p_quantity) end end;
if v_after<i.quantity_reserved or v_after<0 then raise exception 'negative_available_stock'; end if; update public.inventory set quantity_on_hand=v_after where id=i.id;
insert into public.inventory_movements(warehouse_id,product_id,movement_type,quantity,quantity_before,quantity_after,reference,note,created_by) values(p_warehouse_id,p_product_id,p_movement_type,v_after-i.quantity_on_hand,i.quantity_on_hand,v_after,'ADMIN-'||gen_random_uuid(),trim(p_note),auth.uid()); return true; end; $$;

create or replace function public.set_inventory_reorder_level(p_warehouse_id uuid,p_product_id uuid,p_reorder_level integer) returns boolean language plpgsql security definer set search_path='' as $$ begin if not public.is_admin() then raise exception 'forbidden'; end if; if p_reorder_level<0 then raise exception 'invalid_reorder_level'; end if; update public.inventory set reorder_level=p_reorder_level where warehouse_id=p_warehouse_id and product_id=p_product_id; return found; end; $$;
create or replace function public.set_default_warehouse(p_warehouse_id uuid) returns boolean language plpgsql security definer set search_path='' as $$ begin if not public.is_admin() then raise exception 'forbidden'; end if; if not exists(select 1 from public.warehouses where id=p_warehouse_id and is_active) then return false; end if; update public.warehouses set is_default=false where is_default; update public.warehouses set is_default=true where id=p_warehouse_id; return true; end; $$;

drop function if exists public.admin_update_order(uuid,text,text,text);
drop function if exists public.admin_update_order(uuid,text,text,text,boolean);
create function public.admin_update_order(p_order_id uuid,p_status text,p_payment_status text,p_note text,p_restore_stock boolean default false) returns boolean language plpgsql security definer set search_path='' as $$
declare v_history jsonb;v_current text;v_current_payment text;
begin if not public.is_admin() then raise exception 'forbidden'; end if; if p_status not in('received','preparing','shipped','delivered','cancelled') then raise exception 'invalid_status'; end if; if p_payment_status not in('pending','awaiting_payment','paid','failed','cancelled','refunded') then raise exception 'invalid_payment_status'; end if;
select status,payment_status,status_history into v_current,v_current_payment,v_history from public.orders where id=p_order_id for update; if not found then return false; end if;
if p_status='preparing' or p_payment_status='paid' then perform public.complete_order_inventory(p_order_id); end if; if p_status='cancelled' then perform public.release_order_inventory(p_order_id,p_restore_stock,false); end if; if p_payment_status='refunded' and p_restore_stock then perform public.release_order_inventory(p_order_id,true,true); end if;
if v_current<>p_status then v_history:=coalesce(v_history,'[]'::jsonb)||jsonb_build_array(jsonb_build_object('status',p_status,'label',case p_status when'received'then'Sipariş alındı'when'preparing'then'Hazırlanıyor'when'shipped'then'Kargoya verildi'when'delivered'then'Teslim edildi'else'İptal edildi'end,'at',timezone('utc',now())));end if;
if v_current_payment<>p_payment_status then v_history:=coalesce(v_history,'[]'::jsonb)||jsonb_build_array(jsonb_build_object('status','payment:'||p_payment_status,'label','Ödeme durumu: '||p_payment_status,'at',timezone('utc',now())));end if;
update public.orders set status=p_status,payment_status=p_payment_status,admin_note=nullif(trim(p_note),''),status_history=v_history where id=p_order_id; update public.payment_transactions set status=p_payment_status,note=coalesce(nullif(trim(p_note),''),note) where order_id=p_order_id and transaction_type='payment'; return true; end; $$;

revoke all on function public.complete_order_inventory(uuid),public.release_order_inventory(uuid,boolean,boolean),public.adjust_inventory(uuid,uuid,text,integer,text),public.set_inventory_reorder_level(uuid,uuid,integer),public.set_default_warehouse(uuid),public.admin_update_order(uuid,text,text,text,boolean) from public;
grant execute on function public.adjust_inventory(uuid,uuid,text,integer,text),public.set_inventory_reorder_level(uuid,uuid,integer),public.set_default_warehouse(uuid),public.admin_update_order(uuid,text,text,text,boolean) to authenticated;

-- ============================================================================
-- SOURCE: supabase/migrations/202607250002_shipping_and_fulfillment.sql
-- ============================================================================
alter table public.orders add column if not exists fulfillment_status text not null default 'unfulfilled';
alter table public.orders add column if not exists shipping_method text not null default 'standard';
alter table public.orders add column if not exists shipping_method_snapshot jsonb not null default '{"code":"standard","label":"Standart Kargo"}'::jsonb;
alter table public.orders drop constraint if exists orders_fulfillment_status_check;
alter table public.orders add constraint orders_fulfillment_status_check check (fulfillment_status in ('unfulfilled','partially_fulfilled','fulfilled','shipped','partially_delivered','delivered','returned','cancelled'));
alter table public.orders drop constraint if exists orders_shipping_method_check;
alter table public.orders add constraint orders_shipping_method_check check (shipping_method in ('standard','express','store_pickup','same_day'));

create table if not exists public.shipping_carriers(
 id uuid primary key default gen_random_uuid(), name text not null, code text not null unique, provider_key text not null unique,
 tracking_url_template text, logo_url text, support_phone text, description text, is_active boolean not null default true,
 is_default boolean not null default false, supports_api boolean not null default false,
 created_at timestamptz not null default timezone('utc',now()), updated_at timestamptz not null default timezone('utc',now()),
 constraint shipping_carrier_code check(code ~ '^[A-Z0-9_-]{2,32}$'),
 constraint shipping_tracking_template check(tracking_url_template is null or tracking_url_template like 'https://%{trackingNumber}%')
);
create unique index if not exists shipping_carriers_one_default on public.shipping_carriers(is_default) where is_default and is_active;

create table if not exists public.shipments(
 id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete restrict,
 carrier_id uuid not null references public.shipping_carriers(id) on delete restrict, provider_key text not null,
 shipment_number text not null unique, tracking_number text, tracking_url text, status text not null default 'pending',
 carrier_snapshot jsonb not null, recipient_snapshot jsonb not null, package_snapshot jsonb not null default '{}'::jsonb,
 shipping_cost numeric(12,2) not null default 0 check(shipping_cost>=0), currency text not null default 'TRY' check(currency='TRY'),
 admin_note text, shipped_at timestamptz, estimated_delivery_at timestamptz, delivered_at timestamptz, cancelled_at timestamptz,
 created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default timezone('utc',now()), updated_at timestamptz not null default timezone('utc',now()),
 constraint shipment_status check(status in('pending','preparing','ready_for_shipment','shipped','in_transit','out_for_delivery','delivered','delivery_failed','returned','cancelled'))
);
create unique index if not exists shipments_carrier_tracking_unique on public.shipments(carrier_id,tracking_number) where tracking_number is not null;
create index if not exists shipments_order_idx on public.shipments(order_id); create index if not exists shipments_status_idx on public.shipments(status,created_at desc);

create table if not exists public.shipment_items(
 id uuid primary key default gen_random_uuid(), shipment_id uuid not null references public.shipments(id) on delete cascade,
 order_item_id uuid not null references public.order_items(id) on delete restrict, quantity integer not null check(quantity>0),
 created_at timestamptz not null default timezone('utc',now()), unique(shipment_id,order_item_id)
);
create index if not exists shipment_items_order_item_idx on public.shipment_items(order_item_id);
create table if not exists public.shipment_events(
 id uuid primary key default gen_random_uuid(), shipment_id uuid not null references public.shipments(id) on delete cascade,
 status text not null, title text not null, description text, location text, event_time timestamptz not null default timezone('utc',now()),
 provider_event_code text, created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default timezone('utc',now()),
 constraint shipment_event_status check(status in('pending','preparing','ready_for_shipment','shipped','in_transit','out_for_delivery','delivered','delivery_failed','returned','cancelled'))
);
create index if not exists shipment_events_timeline_idx on public.shipment_events(shipment_id,event_time);

insert into public.shipping_carriers(name,code,provider_key,description,is_active,is_default,supports_api)
values('Manuel Kargo','MANUAL','manual','Manuel takip ve teslimat sağlayıcısı',true,true,false)
on conflict(code) do update set name=excluded.name;

create or replace function public.set_shipping_updated_at() returns trigger language plpgsql set search_path='' as $$ begin new.updated_at=timezone('utc',now());return new;end;$$;
drop trigger if exists shipping_carriers_updated on public.shipping_carriers; create trigger shipping_carriers_updated before update on public.shipping_carriers for each row execute function public.set_shipping_updated_at();
drop trigger if exists shipments_updated on public.shipments; create trigger shipments_updated before update on public.shipments for each row execute function public.set_shipping_updated_at();

create or replace function public.recalculate_order_fulfillment(p_order_id uuid) returns text language plpgsql security definer set search_path='' as $$
declare total_qty int; assigned_qty int; active_count int; delivered_count int; returned_count int; result text;
begin
 select coalesce(sum(quantity),0) into total_qty from public.order_items where order_id=p_order_id;
 select coalesce(sum(si.quantity),0),count(distinct s.id),count(distinct s.id) filter(where s.status='delivered'),count(distinct s.id) filter(where s.status='returned')
 into assigned_qty,active_count,delivered_count,returned_count from public.shipments s left join public.shipment_items si on si.shipment_id=s.id where s.order_id=p_order_id and s.status<>'cancelled';
 result:=case when active_count=0 then 'unfulfilled' when returned_count=active_count then 'returned' when delivered_count=active_count and assigned_qty>=total_qty then 'delivered' when delivered_count>0 then 'partially_delivered' when assigned_qty<total_qty then 'partially_fulfilled' when exists(select 1 from public.shipments where order_id=p_order_id and status in('shipped','in_transit','out_for_delivery')) then 'shipped' else 'fulfilled' end;
 update public.orders set fulfillment_status=result where id=p_order_id; return result;
end;$$;

create or replace function public.create_manual_shipment(p_order_id uuid,p_carrier_id uuid,p_items jsonb,p_tracking_number text default null,p_estimated_delivery_at timestamptz default null,p_package jsonb default '{}'::jsonb,p_shipping_cost numeric default 0,p_admin_note text default null) returns uuid language plpgsql security definer set search_path='' as $$
declare o public.orders%rowtype;c public.shipping_carriers%rowtype;s_id uuid;it jsonb;oi public.order_items%rowtype;sent int;qty int;number text;reservation_count int;
begin
 if not public.is_admin() then raise exception 'forbidden';end if;
 select * into o from public.orders where id=p_order_id for update;if not found or o.status='cancelled' then raise exception 'invalid_order';end if;
 select count(*) into reservation_count from public.inventory_reservations where order_id=p_order_id and status='completed';if reservation_count=0 then perform public.complete_order_inventory(p_order_id);end if;
 select * into c from public.shipping_carriers where id=p_carrier_id and is_active for share;if not found then raise exception 'inactive_carrier';end if;
 if not jsonb_typeof(p_items)='array' or jsonb_array_length(p_items)=0 then raise exception 'no_items';end if;
 if coalesce(p_shipping_cost,0)<0 then raise exception 'invalid_package';end if;
 if coalesce((p_package->>'package_count')::numeric,0)<0 or coalesce((p_package->>'weight')::numeric,0)<0 or coalesce((p_package->>'desi')::numeric,0)<0 then raise exception 'invalid_package';end if;
 number:='SHP-'||to_char(timezone('utc',now()),'YYYYMMDD')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
 insert into public.shipments(order_id,carrier_id,provider_key,shipment_number,tracking_number,tracking_url,status,carrier_snapshot,recipient_snapshot,package_snapshot,shipping_cost,estimated_delivery_at,admin_note,created_by)
 values(o.id,c.id,c.provider_key,number,nullif(trim(p_tracking_number),''),case when nullif(trim(p_tracking_number),'') is not null and c.tracking_url_template is not null then replace(c.tracking_url_template,'{trackingNumber}',replace(replace(trim(p_tracking_number),'%','%25'),' ','%20')) end,'ready_for_shipment',jsonb_build_object('name',c.name,'code',c.code,'logo_url',c.logo_url,'support_phone',c.support_phone),o.delivery_address,coalesce(p_package,'{}'::jsonb),coalesce(p_shipping_cost,0),p_estimated_delivery_at,nullif(trim(p_admin_note),''),auth.uid()) returning id into s_id;
 for it in select * from jsonb_array_elements(p_items) loop
  qty:=(it->>'quantity')::int;select * into oi from public.order_items where id=(it->>'order_item_id')::uuid and order_id=o.id for share;if not found or qty<=0 then raise exception 'invalid_item';end if;
  select coalesce(sum(si.quantity),0) into sent from public.shipment_items si join public.shipments s on s.id=si.shipment_id where si.order_item_id=oi.id and s.status<>'cancelled';if sent+qty>oi.quantity then raise exception 'quantity_exceeded';end if;
  insert into public.shipment_items(shipment_id,order_item_id,quantity) values(s_id,oi.id,qty);
 end loop;
 insert into public.shipment_events(shipment_id,status,title,description,created_by) values(s_id,'ready_for_shipment','Gönderi oluşturuldu','Manuel gönderi kaydı hazırlandı.',auth.uid());
 perform public.recalculate_order_fulfillment(o.id);update public.orders set status_history=coalesce(status_history,'[]'::jsonb)||jsonb_build_array(jsonb_build_object('status','shipment_created','label','Gönderi oluşturuldu: '||number,'at',timezone('utc',now()))) where id=o.id;return s_id;
end;$$;

create or replace function public.update_shipment_status(p_shipment_id uuid,p_status text,p_description text default null,p_location text default null) returns boolean language plpgsql security definer set search_path='' as $$
declare s public.shipments%rowtype;label text;
begin if not public.is_admin() then raise exception 'forbidden';end if;if p_status not in('pending','preparing','ready_for_shipment','shipped','in_transit','out_for_delivery','delivered','delivery_failed','returned','cancelled') then raise exception 'invalid_status';end if;
 select * into s from public.shipments where id=p_shipment_id for update;if not found then return false;end if;if s.status='delivered' and p_status<>'delivered' then raise exception 'delivered_locked';end if;if s.status=p_status then return true;end if;
 label:=case p_status when'pending'then'Bekliyor' when'preparing'then'Hazırlanıyor' when'ready_for_shipment'then'Gönderime hazır' when'shipped'then'Kargoya verildi' when'in_transit'then'Transfer sürecinde' when'out_for_delivery'then'Dağıtıma çıktı' when'delivered'then'Teslim edildi' when'delivery_failed'then'Teslim edilemedi' when'returned'then'İade edildi' else'İptal edildi'end;
 update public.shipments set status=p_status,shipped_at=case when p_status='shipped' then coalesce(shipped_at,timezone('utc',now())) else shipped_at end,delivered_at=case when p_status='delivered' then coalesce(delivered_at,timezone('utc',now())) else delivered_at end,cancelled_at=case when p_status='cancelled' then coalesce(cancelled_at,timezone('utc',now())) else cancelled_at end where id=s.id;
 insert into public.shipment_events(shipment_id,status,title,description,location,created_by) values(s.id,p_status,label,nullif(trim(p_description),''),nullif(trim(p_location),''),auth.uid());perform public.recalculate_order_fulfillment(s.order_id);return true;end;$$;

create or replace function public.update_shipment_tracking(p_shipment_id uuid,p_carrier_id uuid,p_tracking_number text,p_estimated_delivery_at timestamptz default null,p_admin_note text default null) returns boolean language plpgsql security definer set search_path='' as $$
declare s public.shipments%rowtype;c public.shipping_carriers%rowtype;t text;
begin if not public.is_admin() then raise exception 'forbidden';end if;select * into s from public.shipments where id=p_shipment_id for update;if not found or s.status='delivered' then raise exception 'shipment_locked';end if;select * into c from public.shipping_carriers where id=p_carrier_id and is_active;if not found then raise exception 'inactive_carrier';end if;t:=nullif(trim(p_tracking_number),'');
 update public.shipments set carrier_id=c.id,provider_key=c.provider_key,carrier_snapshot=jsonb_build_object('name',c.name,'code',c.code,'logo_url',c.logo_url,'support_phone',c.support_phone),tracking_number=t,tracking_url=case when t is not null and c.tracking_url_template is not null then replace(c.tracking_url_template,'{trackingNumber}',replace(replace(t,'%','%25'),' ','%20')) end,estimated_delivery_at=p_estimated_delivery_at,admin_note=nullif(trim(p_admin_note),'') where id=s.id;return true;exception when unique_violation then raise exception 'duplicate_tracking';end;$$;

create or replace function public.add_manual_shipment_event(p_shipment_id uuid,p_title text,p_description text,p_location text,p_event_time timestamptz default null) returns boolean language plpgsql security definer set search_path='' as $$
declare st text;begin if not public.is_admin() then raise exception 'forbidden';end if;select status into st from public.shipments where id=p_shipment_id;if not found or length(trim(p_title))<2 then return false;end if;insert into public.shipment_events(shipment_id,status,title,description,location,event_time,created_by) values(p_shipment_id,st,trim(p_title),nullif(trim(p_description),''),nullif(trim(p_location),''),coalesce(p_event_time,timezone('utc',now())),auth.uid());return true;end;$$;

create or replace function public.set_default_shipping_carrier(p_carrier_id uuid) returns boolean language plpgsql security definer set search_path='' as $$ begin if not public.is_admin() then raise exception 'forbidden';end if;if not exists(select 1 from public.shipping_carriers where id=p_carrier_id and is_active)then return false;end if;update public.shipping_carriers set is_default=false where is_default;update public.shipping_carriers set is_default=true where id=p_carrier_id;return true;end;$$;

alter table public.shipping_carriers enable row level security;alter table public.shipments enable row level security;alter table public.shipment_items enable row level security;alter table public.shipment_events enable row level security;
drop policy if exists carriers_public_read on public.shipping_carriers;create policy carriers_public_read on public.shipping_carriers for select using(is_active or public.is_admin());
drop policy if exists carriers_admin_write on public.shipping_carriers;create policy carriers_admin_write on public.shipping_carriers for all using(public.is_admin()) with check(public.is_admin());
drop policy if exists shipments_owner_admin_read on public.shipments;create policy shipments_owner_admin_read on public.shipments for select using(public.is_admin() or exists(select 1 from public.orders o where o.id=order_id and o.user_id=auth.uid()));
drop policy if exists shipment_items_owner_admin_read on public.shipment_items;create policy shipment_items_owner_admin_read on public.shipment_items for select using(public.is_admin() or exists(select 1 from public.shipments s join public.orders o on o.id=s.order_id where s.id=shipment_id and o.user_id=auth.uid()));
drop policy if exists shipment_events_owner_admin_read on public.shipment_events;create policy shipment_events_owner_admin_read on public.shipment_events for select using(public.is_admin() or exists(select 1 from public.shipments s join public.orders o on o.id=s.order_id where s.id=shipment_id and o.user_id=auth.uid()));
revoke insert,update,delete on public.shipments,public.shipment_items,public.shipment_events from anon,authenticated;
revoke all on function public.recalculate_order_fulfillment(uuid),public.create_manual_shipment(uuid,uuid,jsonb,text,timestamptz,jsonb,numeric,text),public.update_shipment_status(uuid,text,text,text),public.update_shipment_tracking(uuid,uuid,text,timestamptz,text),public.add_manual_shipment_event(uuid,text,text,text,timestamptz),public.set_default_shipping_carrier(uuid) from public;
grant execute on function public.create_manual_shipment(uuid,uuid,jsonb,text,timestamptz,jsonb,numeric,text),public.update_shipment_status(uuid,text,text,text),public.update_shipment_tracking(uuid,uuid,text,timestamptz,text),public.add_manual_shipment_event(uuid,text,text,text,timestamptz),public.set_default_shipping_carrier(uuid) to authenticated;
grant select on public.shipping_carriers to anon,authenticated;grant select on public.shipments,public.shipment_items,public.shipment_events to authenticated;

create or replace function public.get_order_by_reference(p_order_number text,p_contact text) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('order',to_jsonb(o),'items',coalesce((select jsonb_agg(to_jsonb(oi) order by oi.created_at) from public.order_items oi where oi.order_id=o.id),'[]'::jsonb),'shipments',coalesce((select jsonb_agg(to_jsonb(s)||jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(si)||jsonb_build_object('product_name',oi.product_name) order by si.created_at) from public.shipment_items si join public.order_items oi on oi.id=si.order_item_id where si.shipment_id=s.id),'[]'::jsonb),'events',coalesce((select jsonb_agg(to_jsonb(se) order by se.event_time) from public.shipment_events se where se.shipment_id=s.id),'[]'::jsonb)) order by s.created_at) from public.shipments s where s.order_id=o.id),'[]'::jsonb)) from public.orders o where upper(o.order_number)=upper(trim(p_order_number)) and(lower(o.delivery_address->>'email')=lower(trim(p_contact)) or regexp_replace(o.delivery_address->>'phone','\D','','g')=regexp_replace(p_contact,'\D','','g') or(o.user_id is not null and o.user_id=auth.uid())) limit 1;
$$;

-- ============================================================================
-- SOURCE: supabase/migrations/202607250003_audit_logs.sql
-- ============================================================================
-- Production audit log: append-only, admin-readable and system-written.
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_email text,
  actor_role text,
  action text not null check (length(action) between 3 and 100),
  entity_type text not null check (length(entity_type) between 2 and 80),
  entity_id text,
  entity_name text,
  old_data jsonb,
  new_data jsonb,
  metadata jsonb not null default '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index if not exists audit_logs_actor_idx on public.audit_logs (actor_user_id, created_at desc);
create index if not exists audit_logs_action_idx on public.audit_logs (action, created_at desc);
create index if not exists audit_logs_entity_idx on public.audit_logs (entity_type, entity_id, created_at desc);
create index if not exists audit_logs_search_idx on public.audit_logs using gin
  (to_tsvector('simple', coalesce(actor_email, '') || ' ' || coalesce(entity_name, '') || ' ' || action));

alter table public.audit_logs enable row level security;
alter table public.audit_logs force row level security;

revoke all on public.audit_logs from anon, authenticated;
grant select on public.audit_logs to authenticated;

create policy "Admins can read audit logs"
on public.audit_logs for select to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create or replace function public.audit_changed_fields(p_old jsonb, p_new jsonb)
returns table(old_values jsonb, new_values jsonb)
language sql immutable
set search_path = ''
as $$
  with keys as (
    select key from jsonb_object_keys(coalesce(p_old, '{}'::jsonb)) key
    union
    select key from jsonb_object_keys(coalesce(p_new, '{}'::jsonb)) key
  ), changed as (
    select key
    from keys
    where coalesce(p_old -> key, 'null'::jsonb) is distinct from coalesce(p_new -> key, 'null'::jsonb)
      and key not in ('updated_at', 'created_at')
  )
  select
    coalesce(jsonb_object_agg(key, p_old -> key), '{}'::jsonb),
    coalesce(jsonb_object_agg(key, p_new -> key), '{}'::jsonb)
  from changed;
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$ select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false) $$;

create or replace function public.write_audit_log(
  p_action text,
  p_entity_type text,
  p_entity_id text default null,
  p_entity_name text default null,
  p_old_data jsonb default null,
  p_new_data jsonb default null,
  p_metadata jsonb default '{}'::jsonb
) returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_headers jsonb := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb;
begin
  if not public.is_admin() then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  insert into public.audit_logs (
    actor_user_id, actor_email, actor_role, action, entity_type, entity_id,
    entity_name, old_data, new_data, metadata, ip_address, user_agent
  ) values (
    auth.uid(), auth.jwt() ->> 'email', auth.jwt() -> 'app_metadata' ->> 'role',
    lower(trim(p_action)), lower(trim(p_entity_type)), nullif(trim(p_entity_id), ''),
    nullif(trim(p_entity_name), ''), p_old_data, p_new_data,
    coalesce(p_metadata, '{}'::jsonb),
    nullif(split_part(coalesce(v_headers ->> 'x-forwarded-for', ''), ',', 1), '')::inet,
    nullif(v_headers ->> 'user-agent', '')
  ) returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.write_audit_log(text,text,text,text,jsonb,jsonb,jsonb) from public, anon;
grant execute on function public.write_audit_log(text,text,text,text,jsonb,jsonb,jsonb) to authenticated;

create or replace function public.audit_row_change()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_old jsonb := case when tg_op = 'INSERT' then '{}'::jsonb else to_jsonb(old) end;
  v_new jsonb := case when tg_op = 'DELETE' then '{}'::jsonb else to_jsonb(new) end;
  v_old_changed jsonb;
  v_new_changed jsonb;
  v_row jsonb := case when tg_op = 'DELETE' then v_old else v_new end;
  v_action text;
  v_headers jsonb := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb;
begin
  if tg_op = 'UPDATE' and v_old = v_new then return new; end if;
  select old_values, new_values into v_old_changed, v_new_changed
  from public.audit_changed_fields(v_old, v_new);

  v_action := case
    when tg_argv[1] = 'inventory' then 'inventory_adjusted'
    when tg_argv[1] in ('warehouse', 'payment', 'settings') then tg_argv[1] || '_updated'
    when tg_op = 'INSERT' then tg_argv[1] || '_created'
    when tg_op = 'DELETE' then tg_argv[1] || '_deleted'
    when tg_argv[1] = 'product' and (v_old ->> 'is_active')::boolean and not (v_new ->> 'is_active')::boolean then 'product_deleted'
    else tg_argv[1] || '_updated'
  end;

  insert into public.audit_logs (
    actor_user_id, actor_email, actor_role, action, entity_type, entity_id,
    entity_name, old_data, new_data, metadata, ip_address, user_agent
  ) values (
    auth.uid(), auth.jwt() ->> 'email', coalesce(auth.jwt() -> 'app_metadata' ->> 'role', 'system'),
    v_action, tg_argv[0], v_row ->> 'id',
    coalesce(v_row ->> 'name', v_row ->> 'order_number', v_row ->> 'code', v_row ->> 'sku'),
    nullif(v_old_changed, '{}'::jsonb), nullif(v_new_changed, '{}'::jsonb),
    jsonb_strip_nulls(jsonb_build_object(
      'sku', v_row ->> 'sku', 'order_number', v_row ->> 'order_number',
      'tracking_number', v_row ->> 'tracking_number', 'warehouse_id', v_row ->> 'warehouse_id',
      'coupon_code', v_row ->> 'code'
    )),
    nullif(split_part(coalesce(v_headers ->> 'x-forwarded-for', ''), ',', 1), '')::inet,
    nullif(v_headers ->> 'user-agent', '')
  );
  return coalesce(new, old);
end;
$$;

revoke all on function public.audit_row_change() from public, anon, authenticated;

do $$
declare item record;
begin
  for item in select * from (values
    ('products','product'), ('categories','category'), ('brands','brand'),
    ('campaigns','campaign'), ('coupons','coupon'), ('orders','order'),
    ('payment_transactions','payment'), ('payment_accounts','payment'),
    ('shipments','shipment'), ('inventory','inventory'),
    ('inventory_movements','inventory'), ('warehouses','warehouse'),
    ('shipping_carriers','settings'), ('profiles','user')
  ) as tracked(table_name, entity_type)
  loop
    if to_regclass('public.' || item.table_name) is not null then
      execute format('drop trigger if exists audit_%I_changes on public.%I', item.table_name, item.table_name);
      execute format(
        'create trigger audit_%I_changes after insert or update or delete on public.%I for each row execute function public.audit_row_change(%L, %L)',
        item.table_name, item.table_name, item.entity_type, item.entity_type
      );
    end if;
  end loop;
end $$;

comment on table public.audit_logs is 'Immutable administrative audit trail. Writes are only permitted through security-definer functions and database triggers.';

-- ============================================================================
-- SOURCE: supabase/migrations/202607250004_notification_center.sql
-- ============================================================================
create table if not exists public.notification_templates (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9_]+$'),
  name text not null,
  channel text not null check (channel in ('email','sms','whatsapp','push','in_app')),
  subject text,
  body text not null,
  variables jsonb not null default '[]'::jsonb check (jsonb_typeof(variables) = 'array'),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.notification_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (length(event_type) between 3 and 100),
  entity_type text not null,
  entity_id text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','processing','processed','failed')),
  created_at timestamptz not null default timezone('utc', now()),
  processed_at timestamptz
);

create table if not exists public.notification_queue (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.notification_events(id) on delete cascade,
  template_id uuid references public.notification_templates(id) on delete set null,
  channel text not null check (channel in ('email','sms','whatsapp','push','in_app')),
  recipient text not null,
  status text not null default 'pending' check (status in ('pending','processing','sent','failed','cancelled')),
  retry_count integer not null default 0 check (retry_count >= 0),
  scheduled_at timestamptz not null default timezone('utc', now()),
  processed_at timestamptz,
  last_error text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.notification_logs (
  id uuid primary key default gen_random_uuid(),
  queue_id uuid not null references public.notification_queue(id) on delete cascade,
  channel text not null,
  recipient text not null,
  status text not null check (status in ('pending','sent','failed')),
  provider text not null,
  response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists notification_events_status_created_idx on public.notification_events(status, created_at);
create index if not exists notification_events_type_idx on public.notification_events(event_type, created_at desc);
create index if not exists notification_queue_worker_idx on public.notification_queue(status, scheduled_at) where status in ('pending','failed');
create index if not exists notification_queue_event_idx on public.notification_queue(event_id);
create index if not exists notification_logs_queue_idx on public.notification_logs(queue_id, created_at desc);
create index if not exists notification_logs_status_idx on public.notification_logs(status, created_at desc);

alter table public.notification_templates enable row level security;
alter table public.notification_events enable row level security;
alter table public.notification_queue enable row level security;
alter table public.notification_logs enable row level security;

revoke all on public.notification_templates, public.notification_events, public.notification_queue, public.notification_logs from anon, authenticated;
grant select on public.notification_templates, public.notification_events, public.notification_queue, public.notification_logs to authenticated;

create policy "Admins read notification templates" on public.notification_templates for select to authenticated using (public.is_admin());
create policy "Admins read notification events" on public.notification_events for select to authenticated using (public.is_admin());
create policy "Admins read notification queue" on public.notification_queue for select to authenticated using (public.is_admin());
create policy "Admins read notification logs" on public.notification_logs for select to authenticated using (public.is_admin());

create or replace function public.admin_save_notification_template(p_template jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not public.is_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
  if trim(coalesce(p_template->>'code','')) = '' or trim(coalesce(p_template->>'name','')) = '' or trim(coalesce(p_template->>'body','')) = '' then
    raise exception 'invalid_template' using errcode = '22023';
  end if;
  insert into public.notification_templates(id,code,name,channel,subject,body,variables,is_active)
  values (
    coalesce(nullif(p_template->>'id','')::uuid, gen_random_uuid()), lower(trim(p_template->>'code')),
    trim(p_template->>'name'), p_template->>'channel', nullif(trim(p_template->>'subject'),''),
    p_template->>'body', coalesce(p_template->'variables','[]'::jsonb), coalesce((p_template->>'is_active')::boolean,true)
  ) on conflict (id) do update set code=excluded.code,name=excluded.name,channel=excluded.channel,
    subject=excluded.subject,body=excluded.body,variables=excluded.variables,is_active=excluded.is_active,updated_at=timezone('utc',now())
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.publish_notification_event(
  p_event_type text, p_entity_type text, p_entity_id text, p_payload jsonb
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_event_id uuid; v_template record; v_recipient text;
begin
  if not public.is_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
  insert into public.notification_events(event_type,entity_type,entity_id,payload)
  values(lower(trim(p_event_type)),lower(trim(p_entity_type)),nullif(trim(p_entity_id),''),coalesce(p_payload,'{}'::jsonb)) returning id into v_event_id;
  for v_template in select * from public.notification_templates where is_active and code like lower(trim(p_event_type)) || '\_%' escape '\' loop
    v_recipient := case v_template.channel
      when 'email' then p_payload->>'recipient_email' when 'sms' then p_payload->>'recipient_phone'
      when 'whatsapp' then p_payload->>'recipient_phone' when 'push' then p_payload->>'push_token'
      else coalesce(p_payload->>'user_id', p_payload->>'recipient_email') end;
    if nullif(trim(v_recipient),'') is not null then
      insert into public.notification_queue(event_id,template_id,channel,recipient)
      values(v_event_id,v_template.id,v_template.channel,v_recipient);
    end if;
  end loop;
  update public.notification_events set status='processed',processed_at=timezone('utc',now()) where id=v_event_id;
  return v_event_id;
end $$;

create or replace function public.admin_complete_notification(
  p_queue_id uuid, p_success boolean, p_provider text, p_response jsonb, p_error text default null
) returns boolean language plpgsql security definer set search_path = '' as $$
declare v_queue public.notification_queue%rowtype;
begin
  if not public.is_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
  select * into v_queue from public.notification_queue where id=p_queue_id for update;
  if not found then raise exception 'queue_not_found' using errcode='P0002'; end if;
  update public.notification_queue set status=case when p_success then 'sent' else 'failed' end,
    retry_count=case when p_success then retry_count else retry_count+1 end,
    processed_at=timezone('utc',now()),last_error=case when p_success then null else left(p_error,500) end where id=p_queue_id;
  insert into public.notification_logs(queue_id,channel,recipient,status,provider,response)
  values(v_queue.id,v_queue.channel,v_queue.recipient,case when p_success then 'sent' else 'failed' end,p_provider,coalesce(p_response,'{}'::jsonb));
  return true;
end $$;

revoke all on function public.admin_save_notification_template(jsonb) from public,anon;
revoke all on function public.publish_notification_event(text,text,text,jsonb) from public,anon;
revoke all on function public.admin_complete_notification(uuid,boolean,text,jsonb,text) from public,anon;
grant execute on function public.admin_save_notification_template(jsonb), public.publish_notification_event(text,text,text,jsonb), public.admin_complete_notification(uuid,boolean,text,jsonb,text) to authenticated;

insert into public.notification_templates(code,name,channel,subject,body,variables) values
('order_created_email','Yeni sipariş e-postası','email','Siparişiniz alındı: {{order_number}}','Merhaba {{customer_name}}, {{order_number}} numaralı siparişiniz alındı. Toplam: {{total_amount}}. {{company_name}}','["customer_name","order_number","total_amount","company_name"]'),
('shipment_shipped_sms','Kargoya verildi SMS','sms',null,'{{order_number}} siparişiniz kargoya verildi. Takip: {{tracking_number}}','["order_number","tracking_number"]'),
('stock_low_in_app','Düşük stok bildirimi','in_app','Düşük stok: {{product_name}}','{{product_name}} ürünü kritik stok seviyesine ulaştı.','["product_name"]')
on conflict (code) do nothing;

drop trigger if exists audit_notification_templates_changes on public.notification_templates;
create trigger audit_notification_templates_changes
after insert or update or delete on public.notification_templates
for each row execute function public.audit_row_change('settings', 'settings');

-- ============================================================================
-- SOURCE: supabase/migrations/202607250005_crm.sql
-- ============================================================================
create table if not exists public.customer_profiles (
  id uuid primary key default gen_random_uuid(), user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null default '', email text not null default '', phone text,
  status text not null default 'active' check(status in ('active','inactive','blocked')),
  segment text not null default 'new' check(segment in ('new','active','vip','inactive','blocked')),
  lifetime_value numeric(14,2) not null default 0 check(lifetime_value>=0), order_count integer not null default 0 check(order_count>=0),
  last_order_at timestamptz,last_login_at timestamptz,marketing_opt_in boolean not null default false,
  created_at timestamptz not null default timezone('utc',now()),updated_at timestamptz not null default timezone('utc',now())
);
create table if not exists public.customer_notes (
  id uuid primary key default gen_random_uuid(),customer_id uuid not null references public.customer_profiles(id) on delete cascade,
  admin_id uuid not null references auth.users(id) on delete restrict,note text not null check(length(trim(note)) between 1 and 4000),
  is_private boolean not null default true,created_at timestamptz not null default timezone('utc',now()),updated_at timestamptz not null default timezone('utc',now())
);
create table if not exists public.customer_tags (
  id uuid primary key default gen_random_uuid(),name text not null unique,color text not null default '#52525b' check(color ~ '^#[0-9A-Fa-f]{6}$'),
  description text,created_at timestamptz not null default timezone('utc',now())
);
create table if not exists public.customer_tag_relations (
  customer_id uuid not null references public.customer_profiles(id) on delete cascade,tag_id uuid not null references public.customer_tags(id) on delete cascade,
  created_at timestamptz not null default timezone('utc',now()),primary key(customer_id,tag_id)
);
create table if not exists public.customer_activity (
  id uuid primary key default gen_random_uuid(),customer_id uuid not null references public.customer_profiles(id) on delete cascade,
  activity_type text not null,description text not null,metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc',now())
);
create index if not exists customer_profiles_segment_status_idx on public.customer_profiles(segment,status);
create index if not exists customer_profiles_ltv_idx on public.customer_profiles(lifetime_value desc);
create index if not exists customer_profiles_order_count_idx on public.customer_profiles(order_count desc);
create index if not exists customer_profiles_search_idx on public.customer_profiles using gin(to_tsvector('simple',full_name||' '||email||' '||coalesce(phone,'')));
create index if not exists customer_notes_customer_idx on public.customer_notes(customer_id,created_at desc);
create index if not exists customer_activity_customer_idx on public.customer_activity(customer_id,created_at desc);
create index if not exists customer_tag_relations_tag_idx on public.customer_tag_relations(tag_id,customer_id);

alter table public.customer_profiles enable row level security;alter table public.customer_notes enable row level security;
alter table public.customer_tags enable row level security;alter table public.customer_tag_relations enable row level security;alter table public.customer_activity enable row level security;
revoke all on public.customer_profiles,public.customer_notes,public.customer_tags,public.customer_tag_relations,public.customer_activity from anon,authenticated;
grant select on public.customer_profiles,public.customer_notes,public.customer_tags,public.customer_tag_relations,public.customer_activity to authenticated;
create policy "Admins or owners read customer profiles" on public.customer_profiles for select to authenticated using(public.is_admin() or user_id=auth.uid());
create policy "Admins read customer notes" on public.customer_notes for select to authenticated using(public.is_admin());
create policy "Admins read customer tags" on public.customer_tags for select to authenticated using(public.is_admin());
create policy "Admins read customer tag relations" on public.customer_tag_relations for select to authenticated using(public.is_admin());
create policy "Admins read customer activity" on public.customer_activity for select to authenticated using(public.is_admin());

create or replace function public.crm_segment(p_status text,p_lifetime numeric,p_orders integer,p_last_order timestamptz)
returns text language sql stable set search_path='' as $$select case when p_status='blocked' then 'blocked' when p_lifetime>=50000 or p_orders>=8 then 'vip' when p_orders=0 and p_last_order is null then 'new' when p_last_order is null or p_last_order<timezone('utc',now())-interval '180 days' then 'inactive' else 'active' end $$;
create or replace function public.crm_refresh_customer(p_user_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_customer uuid;v_ltv numeric;v_count integer;v_last timestamptz;
begin
  select coalesce(sum(grand_total) filter(where status='delivered'),0),count(*) filter(where status<>'cancelled'),max(created_at)
  into v_ltv,v_count,v_last from public.orders where user_id=p_user_id;
  update public.customer_profiles set lifetime_value=v_ltv,order_count=v_count,last_order_at=v_last,
    segment=public.crm_segment(status,v_ltv,v_count,v_last),updated_at=timezone('utc',now()) where user_id=p_user_id returning id into v_customer;
  return v_customer;
end $$;
create or replace function public.crm_sync_profile() returns trigger language plpgsql security definer set search_path='' as $$
declare v_email text;v_customer uuid;
begin select email into v_email from auth.users where id=new.id;
  insert into public.customer_profiles(user_id,full_name,email,phone)
  values(new.id,trim(concat_ws(' ',new.first_name,new.last_name)),coalesce(v_email,''),new.phone)
  on conflict(user_id) do update set full_name=excluded.full_name,email=excluded.email,phone=excluded.phone,updated_at=timezone('utc',now()) returning id into v_customer;
  if not exists(select 1 from public.customer_activity where customer_id=v_customer and activity_type='user_registered') then insert into public.customer_activity(customer_id,activity_type,description) values(v_customer,'user_registered','Müşteri kayıt oldu');end if;return new;
end $$;
drop trigger if exists crm_profiles_sync on public.profiles;create trigger crm_profiles_sync after insert or update on public.profiles for each row execute function public.crm_sync_profile();
insert into public.customer_profiles(user_id,full_name,email,phone)
select p.id,trim(concat_ws(' ',p.first_name,p.last_name)),coalesce(u.email,''),p.phone from public.profiles p join auth.users u on u.id=p.id on conflict(user_id) do nothing;

create or replace function public.crm_order_activity() returns trigger language plpgsql security definer set search_path='' as $$
declare v_customer uuid;v_type text;begin if new.user_id is null then return new;end if;v_customer:=public.crm_refresh_customer(new.user_id);
v_type:=case when tg_op='INSERT' then 'order_created' when new.status='cancelled' and old.status is distinct from new.status then 'order_cancelled' when new.payment_status='paid' and old.payment_status is distinct from new.payment_status then 'payment_received' when new.status='shipped' and old.status is distinct from new.status then 'shipment_shipped' else null end;
if v_type is not null then insert into public.customer_activity(customer_id,activity_type,description,metadata) values(v_customer,v_type,'Sipariş hareketi: '||new.order_number,jsonb_build_object('order_id',new.id,'order_number',new.order_number));end if;return new;end $$;
drop trigger if exists crm_orders_activity on public.orders;create trigger crm_orders_activity after insert or update of status,payment_status on public.orders for each row execute function public.crm_order_activity();

create or replace function public.admin_update_customer(p_customer_id uuid,p_status text,p_segment text,p_marketing_opt_in boolean)
returns boolean language plpgsql security definer set search_path='' as $$begin if not public.is_admin() then raise exception 'admin_required' using errcode='42501';end if;
update public.customer_profiles set status=p_status,segment=case when p_status='blocked' then 'blocked' else p_segment end,marketing_opt_in=p_marketing_opt_in,updated_at=timezone('utc',now()) where id=p_customer_id;
insert into public.customer_activity(customer_id,activity_type,description,metadata) values(p_customer_id,'profile_updated','Müşteri profili yönetici tarafından güncellendi',jsonb_build_object('admin_id',auth.uid()));
if to_regclass('public.notification_events') is not null then insert into public.notification_events(event_type,entity_type,entity_id,payload,status,processed_at) values('customer_updated','customer',p_customer_id::text,jsonb_build_object('customer_id',p_customer_id),'processed',timezone('utc',now()));end if;return true;end $$;
create or replace function public.admin_add_customer_note(p_customer_id uuid,p_note text,p_is_private boolean)
returns uuid language plpgsql security definer set search_path='' as $$declare v_id uuid;begin if not public.is_admin() then raise exception 'admin_required' using errcode='42501';end if;insert into public.customer_notes(customer_id,admin_id,note,is_private) values(p_customer_id,auth.uid(),trim(p_note),p_is_private) returning id into v_id;insert into public.customer_activity(customer_id,activity_type,description,metadata) values(p_customer_id,'note_added','Yönetici notu eklendi',jsonb_build_object('note_id',v_id));return v_id;end $$;
create or replace function public.admin_add_customer_tag(p_customer_id uuid,p_tag_name text,p_color text,p_description text)
returns uuid language plpgsql security definer set search_path='' as $$declare v_tag uuid;begin if not public.is_admin() then raise exception 'admin_required' using errcode='42501';end if;insert into public.customer_tags(name,color,description) values(trim(p_tag_name),p_color,nullif(trim(p_description),'')) on conflict(name) do update set color=excluded.color returning id into v_tag;insert into public.customer_tag_relations(customer_id,tag_id) values(p_customer_id,v_tag) on conflict do nothing;insert into public.customer_activity(customer_id,activity_type,description,metadata) values(p_customer_id,'tag_added','Müşteri etiketi eklendi',jsonb_build_object('tag_id',v_tag,'tag',p_tag_name));return v_tag;end $$;
create or replace function public.admin_remove_customer_tag(p_customer_id uuid,p_tag_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$begin if not public.is_admin() then raise exception 'admin_required' using errcode='42501';end if;delete from public.customer_tag_relations where customer_id=p_customer_id and tag_id=p_tag_id;insert into public.customer_activity(customer_id,activity_type,description,metadata) values(p_customer_id,'tag_removed','Müşteri etiketi kaldırıldı',jsonb_build_object('tag_id',p_tag_id));return true;end $$;
create or replace function public.admin_log_customer_activity(p_customer_id uuid,p_activity_type text,p_description text,p_metadata jsonb)
returns uuid language plpgsql security definer set search_path='' as $$declare v_id uuid;begin if not public.is_admin() then raise exception 'admin_required' using errcode='42501';end if;insert into public.customer_activity(customer_id,activity_type,description,metadata) values(p_customer_id,p_activity_type,p_description,coalesce(p_metadata,'{}')) returning id into v_id;return v_id;end $$;
create or replace function public.record_customer_login() returns boolean language plpgsql security definer set search_path='' as $$declare v_customer uuid;begin if auth.uid() is null then raise exception 'authentication_required' using errcode='42501';end if;update public.customer_profiles set last_login_at=timezone('utc',now()),updated_at=timezone('utc',now()) where user_id=auth.uid() returning id into v_customer;if v_customer is not null then insert into public.customer_activity(customer_id,activity_type,description) values(v_customer,'user_login','Müşteri giriş yaptı');end if;return true;end $$;
revoke all on function public.admin_update_customer(uuid,text,text,boolean),public.admin_add_customer_note(uuid,text,boolean),public.admin_add_customer_tag(uuid,text,text,text),public.admin_remove_customer_tag(uuid,uuid),public.admin_log_customer_activity(uuid,text,text,jsonb) from public,anon;
grant execute on function public.admin_update_customer(uuid,text,text,boolean),public.admin_add_customer_note(uuid,text,boolean),public.admin_add_customer_tag(uuid,text,text,text),public.admin_remove_customer_tag(uuid,uuid),public.admin_log_customer_activity(uuid,text,text,jsonb) to authenticated;
revoke all on function public.record_customer_login() from public,anon;grant execute on function public.record_customer_login() to authenticated;

drop trigger if exists audit_customer_profiles_changes on public.customer_profiles;create trigger audit_customer_profiles_changes after insert or update or delete on public.customer_profiles for each row execute function public.audit_row_change('user','user');
drop trigger if exists audit_customer_notes_changes on public.customer_notes;create trigger audit_customer_notes_changes after insert or update or delete on public.customer_notes for each row execute function public.audit_row_change('user','user');
drop trigger if exists audit_customer_tags_changes on public.customer_tags;create trigger audit_customer_tags_changes after insert or update or delete on public.customer_tags for each row execute function public.audit_row_change('user','user');
drop trigger if exists audit_customer_tag_relations_changes on public.customer_tag_relations;create trigger audit_customer_tag_relations_changes after insert or update or delete on public.customer_tag_relations for each row execute function public.audit_row_change('user','user');

-- ============================================================================
-- SOURCE: supabase/migrations/202607250006_analytics_and_reporting.sql
-- ============================================================================
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.analytics_daily_metrics (
 id uuid primary key default gen_random_uuid(),metric_date date not null unique,gross_revenue numeric(14,2) not null default 0,net_revenue numeric(14,2) not null default 0,
 discount_total numeric(14,2) not null default 0,shipping_revenue numeric(14,2) not null default 0,tax_total numeric(14,2) not null default 0,refund_total numeric(14,2) not null default 0,
 order_count integer not null default 0,completed_order_count integer not null default 0,cancelled_order_count integer not null default 0,customer_count integer not null default 0,
 new_customer_count integer not null default 0,average_order_value numeric(14,2) not null default 0,items_sold integer not null default 0,
 created_at timestamptz not null default timezone('utc',now()),updated_at timestamptz not null default timezone('utc',now())
);
create table if not exists public.analytics_product_metrics (
 id uuid primary key default gen_random_uuid(),metric_date date not null,product_id uuid,product_name text not null,sku text not null,brand_name text,
 units_sold integer not null default 0,gross_revenue numeric(14,2) not null default 0,net_revenue numeric(14,2) not null default 0,discount_total numeric(14,2) not null default 0,
 refund_quantity integer not null default 0,refund_total numeric(14,2) not null default 0,order_count integer not null default 0,
 created_at timestamptz not null default timezone('utc',now()),updated_at timestamptz not null default timezone('utc',now()),unique(metric_date,product_id,sku)
);
create table if not exists public.analytics_customer_metrics (
 id uuid primary key default gen_random_uuid(),metric_date date not null,customer_id uuid references public.customer_profiles(id) on delete set null,customer_key text not null,
 order_count integer not null default 0,revenue numeric(14,2) not null default 0,items_purchased integer not null default 0,refund_total numeric(14,2) not null default 0,
 first_order_at timestamptz,last_order_at timestamptz,is_repeat_customer boolean not null default false,
 created_at timestamptz not null default timezone('utc',now()),updated_at timestamptz not null default timezone('utc',now()),unique(metric_date,customer_key)
);
create table if not exists public.analytics_events (
 id uuid primary key default gen_random_uuid(),event_name text not null,entity_type text not null,entity_id text not null,user_id uuid references auth.users(id) on delete set null,
 session_id text,payload jsonb not null default '{}'::jsonb,occurred_at timestamptz not null default timezone('utc',now()),created_at timestamptz not null default timezone('utc',now()),
 unique(event_name,entity_type,entity_id)
);
create index if not exists analytics_daily_date_idx on public.analytics_daily_metrics(metric_date desc);
create index if not exists analytics_product_date_revenue_idx on public.analytics_product_metrics(metric_date,net_revenue desc);
create index if not exists analytics_customer_date_revenue_idx on public.analytics_customer_metrics(metric_date,revenue desc);
create index if not exists analytics_events_occurred_idx on public.analytics_events(occurred_at desc,event_name);

alter table public.analytics_daily_metrics enable row level security;alter table public.analytics_product_metrics enable row level security;
alter table public.analytics_customer_metrics enable row level security;alter table public.analytics_events enable row level security;
revoke all on public.analytics_daily_metrics,public.analytics_product_metrics,public.analytics_customer_metrics,public.analytics_events from anon,authenticated;
grant select on public.analytics_daily_metrics,public.analytics_product_metrics,public.analytics_customer_metrics,public.analytics_events to authenticated;
create policy "Admins read daily analytics" on public.analytics_daily_metrics for select to authenticated using(public.is_admin());
create policy "Admins read product analytics" on public.analytics_product_metrics for select to authenticated using(public.is_admin());
create policy "Admins read customer analytics" on public.analytics_customer_metrics for select to authenticated using(public.is_admin());
create policy "Admins read analytics events" on public.analytics_events for select to authenticated using(public.is_admin());

create or replace function public.analytics_validate_range(p_start date,p_end date) returns boolean language plpgsql immutable set search_path='' as $$begin if p_start is null or p_end is null or p_start>p_end or p_end-p_start>366 then raise exception 'invalid_analytics_range' using errcode='22023';end if;return true;end $$;
create or replace function public.refresh_analytics_daily_metrics(start_date date,end_date date) returns integer language plpgsql security definer set search_path='' as $$declare v_count integer;begin if not public.is_admin() then raise exception 'admin_required' using errcode='42501';end if;perform public.analytics_validate_range(start_date,end_date);
insert into public.analytics_daily_metrics(metric_date,gross_revenue,net_revenue,discount_total,shipping_revenue,tax_total,refund_total,order_count,completed_order_count,cancelled_order_count,customer_count,new_customer_count,average_order_value,items_sold)
select d::date,
 coalesce(sum(o.subtotal+o.discount_total) filter(where o.status<>'cancelled'),0),
 coalesce(sum(o.grand_total) filter(where o.status='delivered' and o.payment_status='paid'),0)-coalesce(sum(r.refund),0),
 coalesce(sum(o.discount_total) filter(where o.status<>'cancelled'),0),coalesce(sum(o.shipping_total) filter(where o.status<>'cancelled'),0),coalesce(sum(o.tax_total) filter(where o.status<>'cancelled'),0),coalesce(sum(r.refund),0),
 count(o.id),count(o.id) filter(where o.status='delivered'),count(o.id) filter(where o.status='cancelled'),count(distinct o.user_id),
 (select count(*) from public.customer_profiles c where c.created_at::date=d::date),
 coalesce(avg(o.grand_total) filter(where o.status<>'cancelled'),0),coalesce(sum(i.items) filter(where o.status<>'cancelled'),0)
from generate_series(start_date,end_date,'1 day') d left join public.orders o on o.created_at::date=d::date
left join (select order_id,sum(amount) refund from public.payment_transactions where transaction_type='refund' or status='refunded' group by order_id) r on r.order_id=o.id
left join (select order_id,sum(quantity) items from public.order_items group by order_id)i on i.order_id=o.id group by d
on conflict(metric_date) do update set gross_revenue=excluded.gross_revenue,net_revenue=greatest(excluded.net_revenue,0),discount_total=excluded.discount_total,shipping_revenue=excluded.shipping_revenue,tax_total=excluded.tax_total,refund_total=excluded.refund_total,order_count=excluded.order_count,completed_order_count=excluded.completed_order_count,cancelled_order_count=excluded.cancelled_order_count,customer_count=excluded.customer_count,new_customer_count=excluded.new_customer_count,average_order_value=excluded.average_order_value,items_sold=excluded.items_sold,updated_at=timezone('utc',now());
get diagnostics v_count=row_count;perform public.write_audit_log('analytics_refreshed','system',null,'Günlük analitik',null,null,jsonb_build_object('start_date',start_date,'end_date',end_date,'report_type','daily','row_count',v_count));return v_count;end $$;

create or replace function public.refresh_analytics_product_metrics(start_date date,end_date date) returns integer language plpgsql security definer set search_path='' as $$declare v_count integer;begin if not public.is_admin() then raise exception 'admin_required' using errcode='42501';end if;perform public.analytics_validate_range(start_date,end_date);
delete from public.analytics_product_metrics where metric_date between start_date and end_date;
insert into public.analytics_product_metrics(metric_date,product_id,product_name,sku,brand_name,units_sold,gross_revenue,net_revenue,discount_total,refund_quantity,refund_total,order_count)
select o.created_at::date,oi.product_id,oi.product_name,oi.sku,coalesce(oi.product_snapshot->>'brand',''),sum(oi.quantity) filter(where o.status<>'cancelled'),sum(oi.unit_price*oi.quantity) filter(where o.status<>'cancelled'),sum(oi.line_total) filter(where o.status='delivered' and o.payment_status='paid'),sum(oi.discount_total) filter(where o.status<>'cancelled'),coalesce(sum(oi.quantity) filter(where o.status='returned'),0),coalesce(sum(oi.line_total) filter(where o.status='returned'),0),count(distinct o.id) filter(where o.status<>'cancelled')
from public.order_items oi join public.orders o on o.id=oi.order_id where o.created_at::date between start_date and end_date group by o.created_at::date,oi.product_id,oi.product_name,oi.sku,oi.product_snapshot->>'brand';get diagnostics v_count=row_count;perform public.write_audit_log('analytics_refreshed','system',null,'Ürün analitiği',null,null,jsonb_build_object('start_date',start_date,'end_date',end_date,'report_type','products','row_count',v_count));return v_count;end $$;

create or replace function public.refresh_analytics_customer_metrics(start_date date,end_date date) returns integer language plpgsql security definer set search_path='' as $$declare v_count integer;begin if not public.is_admin() then raise exception 'admin_required' using errcode='42501';end if;perform public.analytics_validate_range(start_date,end_date);
delete from public.analytics_customer_metrics where metric_date between start_date and end_date;
insert into public.analytics_customer_metrics(metric_date,customer_id,customer_key,order_count,revenue,items_purchased,refund_total,first_order_at,last_order_at,is_repeat_customer)
select o.created_at::date,c.id,coalesce(c.id::text,'guest:'||encode(extensions.digest(coalesce(o.delivery_address->>'email',o.order_number),'sha256'),'hex')),count(distinct o.id) filter(where o.status<>'cancelled'),coalesce(sum(o.grand_total) filter(where o.status='delivered' and o.payment_status='paid'),0),coalesce(sum(i.items) filter(where o.status<>'cancelled'),0),coalesce(sum(r.refund),0),min(o.created_at),max(o.created_at),count(distinct o.id) filter(where o.status<>'cancelled')>1
from public.orders o left join public.customer_profiles c on c.user_id=o.user_id left join(select order_id,sum(quantity)items from public.order_items group by order_id)i on i.order_id=o.id left join(select order_id,sum(amount)refund from public.payment_transactions where transaction_type='refund' or status='refunded' group by order_id)r on r.order_id=o.id where o.created_at::date between start_date and end_date group by o.created_at::date,c.id,coalesce(c.id::text,'guest:'||encode(extensions.digest(coalesce(o.delivery_address->>'email',o.order_number),'sha256'),'hex'));get diagnostics v_count=row_count;perform public.write_audit_log('analytics_refreshed','system',null,'Müşteri analitiği',null,null,jsonb_build_object('start_date',start_date,'end_date',end_date,'report_type','customers','row_count',v_count));return v_count;end $$;

revoke all on function public.refresh_analytics_daily_metrics(date,date),public.refresh_analytics_product_metrics(date,date),public.refresh_analytics_customer_metrics(date,date) from public,anon;
grant execute on function public.refresh_analytics_daily_metrics(date,date),public.refresh_analytics_product_metrics(date,date),public.refresh_analytics_customer_metrics(date,date) to authenticated;

create or replace function public.analytics_order_event() returns trigger language plpgsql security definer set search_path='' as $$declare v_event text;begin v_event:=case when tg_op='INSERT' then 'order_created' when new.status='delivered' and old.status is distinct from new.status then 'order_completed' when new.status='cancelled' and old.status is distinct from new.status then 'order_cancelled' else null end;if v_event is not null then insert into public.analytics_events(event_name,entity_type,entity_id,user_id,payload,occurred_at)values(v_event,'order',new.id::text,new.user_id,jsonb_build_object('order_number',new.order_number,'status',new.status),new.updated_at)on conflict do nothing;end if;return new;end $$;
drop trigger if exists analytics_orders_events on public.orders;create trigger analytics_orders_events after insert or update of status on public.orders for each row execute function public.analytics_order_event();
create or replace function public.analytics_payment_event() returns trigger language plpgsql security definer set search_path='' as $$declare v_event text;begin v_event:=case when new.status='paid' then 'payment_succeeded' when new.status='failed' then 'payment_failed' when new.status='refunded' or new.transaction_type='refund' then 'refund_completed' else null end;if v_event is not null then insert into public.analytics_events(event_name,entity_type,entity_id,payload,occurred_at)values(v_event,'payment',new.id::text,jsonb_build_object('order_id',new.order_id,'status',new.status),new.updated_at)on conflict do nothing;end if;return new;end $$;
drop trigger if exists analytics_payment_events on public.payment_transactions;create trigger analytics_payment_events after insert or update of status on public.payment_transactions for each row execute function public.analytics_payment_event();
create or replace function public.analytics_shipment_event() returns trigger language plpgsql security definer set search_path='' as $$declare v_event text;begin v_event:=case when new.status in('shipped','in_transit') then 'shipment_shipped' when new.status='delivered' then 'shipment_delivered' else null end;if v_event is not null then insert into public.analytics_events(event_name,entity_type,entity_id,payload,occurred_at)values(v_event,'shipment',new.id::text,jsonb_build_object('order_id',new.order_id,'status',new.status),new.updated_at)on conflict do nothing;end if;return new;end $$;
drop trigger if exists analytics_shipment_events on public.shipments;create trigger analytics_shipment_events after insert or update of status on public.shipments for each row execute function public.analytics_shipment_event();
create or replace function public.analytics_customer_event() returns trigger language plpgsql security definer set search_path='' as $$begin insert into public.analytics_events(event_name,entity_type,entity_id,user_id,payload,occurred_at)values('customer_registered','customer',new.id::text,new.user_id,'{}'::jsonb,new.created_at)on conflict do nothing;return new;end $$;
drop trigger if exists analytics_customer_events on public.customer_profiles;create trigger analytics_customer_events after insert on public.customer_profiles for each row execute function public.analytics_customer_event();

-- ============================================================================
-- SOURCE: supabase/migrations/202607250007_payment_gateway.sql
-- ============================================================================
create extension if not exists pgcrypto with schema extensions;
create table if not exists public.payment_providers(
 id uuid primary key default gen_random_uuid(),code text not null unique check(code in('mock','iyzico','paytr','param')),name text not null,is_active boolean not null default false,
 mode text not null default 'sandbox' check(mode in('sandbox','production')),health_status text not null default 'unknown' check(health_status in('unknown','healthy','degraded','down')),
 last_health_check_at timestamptz,last_connected_at timestamptz,capabilities jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default timezone('utc',now()),updated_at timestamptz not null default timezone('utc',now())
);
create table if not exists public.payment_provider_settings(
 id uuid primary key default gen_random_uuid(),provider_id uuid not null references public.payment_providers(id) on delete cascade,setting_key text not null,
 public_value jsonb,secret_hash text,secret_env_key text,created_at timestamptz not null default timezone('utc',now()),updated_at timestamptz not null default timezone('utc',now()),
 unique(provider_id,setting_key),check(secret_hash is null or public_value is null)
);
create table if not exists public.payment_webhooks(
 id uuid primary key default gen_random_uuid(),provider_id uuid not null references public.payment_providers(id) on delete restrict,external_event_id text not null,event_type text not null,
 status text not null default 'received' check(status in('received','processing','processed','failed','ignored')),signature_valid boolean not null,payload_hash text not null,
 payload_summary jsonb not null default '{}'::jsonb,retry_count integer not null default 0,last_error text,received_at timestamptz not null default timezone('utc',now()),processed_at timestamptz,
 created_at timestamptz not null default timezone('utc',now()),unique(provider_id,external_event_id)
);
create table if not exists public.payment_refunds(
 id uuid primary key default gen_random_uuid(),payment_transaction_id uuid not null references public.payment_transactions(id) on delete restrict,order_id uuid not null references public.orders(id) on delete restrict,
 provider_id uuid not null references public.payment_providers(id) on delete restrict,refund_type text not null check(refund_type in('full','partial')),amount numeric(14,2) not null check(amount>0),
 status text not null default 'pending' check(status in('pending','succeeded','failed','cancelled')),provider_reference text,reason text,metadata jsonb not null default '{}'::jsonb,
 requested_by uuid references auth.users(id) on delete set null,processed_at timestamptz,created_at timestamptz not null default timezone('utc',now()),updated_at timestamptz not null default timezone('utc',now())
);
create index if not exists payment_webhooks_status_idx on public.payment_webhooks(status,received_at desc);create index if not exists payment_webhooks_provider_idx on public.payment_webhooks(provider_id,received_at desc);
create index if not exists payment_refunds_order_idx on public.payment_refunds(order_id,created_at desc);create index if not exists payment_refunds_status_idx on public.payment_refunds(status,created_at desc);
alter table public.payment_providers enable row level security;alter table public.payment_provider_settings enable row level security;alter table public.payment_webhooks enable row level security;alter table public.payment_refunds enable row level security;
revoke all on public.payment_providers,public.payment_provider_settings,public.payment_webhooks,public.payment_refunds from anon,authenticated;
grant select on public.payment_providers,public.payment_provider_settings,public.payment_webhooks,public.payment_refunds to authenticated;
create policy "Admins read payment providers" on public.payment_providers for select to authenticated using(public.is_admin());create policy "Admins read provider settings" on public.payment_provider_settings for select to authenticated using(public.is_admin());create policy "Admins read payment webhooks" on public.payment_webhooks for select to authenticated using(public.is_admin());create policy "Admins read payment refunds" on public.payment_refunds for select to authenticated using(public.is_admin());

insert into public.payment_providers(code,name,is_active,mode,capabilities)values
('mock','Production Mock Provider',true,'sandbox','{"payment":true,"cancel":true,"refund":true,"webhook":true}'),
('iyzico','İyzico',false,'sandbox','{"payment":true,"cancel":true,"refund":true,"webhook":true}'),
('paytr','PayTR',false,'sandbox','{"payment":true,"refund":true,"webhook":true}'),
('param','Param',false,'sandbox','{"payment":true,"cancel":true,"refund":true,"webhook":true}') on conflict(code) do nothing;

create or replace function public.admin_update_payment_provider(p_provider_id uuid,p_is_active boolean,p_mode text)
returns boolean language plpgsql security definer set search_path='' as $$begin if not public.is_admin() then raise exception 'admin_required' using errcode='42501';end if;update public.payment_providers set is_active=p_is_active,mode=p_mode,updated_at=timezone('utc',now()) where id=p_provider_id;perform public.write_audit_log('payment_provider_updated','payment',p_provider_id::text,'Payment provider',null,jsonb_build_object('is_active',p_is_active,'mode',p_mode),'{}');return true;end $$;
create or replace function public.admin_set_payment_provider_secret(p_provider_id uuid,p_setting_key text,p_secret text,p_env_key text)
returns boolean language plpgsql security definer set search_path='' as $$begin if not public.is_admin() then raise exception 'admin_required' using errcode='42501';end if;if length(p_secret)<16 then raise exception 'weak_secret' using errcode='22023';end if;insert into public.payment_provider_settings(provider_id,setting_key,secret_hash,secret_env_key)values(p_provider_id,p_setting_key,extensions.crypt(p_secret,extensions.gen_salt('bf')),p_env_key)on conflict(provider_id,setting_key)do update set secret_hash=excluded.secret_hash,secret_env_key=excluded.secret_env_key,updated_at=timezone('utc',now());return true;end $$;
create or replace function public.record_payment_webhook(p_provider text,p_external_event_id text,p_event_type text,p_payload_hash text,p_payload_summary jsonb,p_provider_secret text)
returns uuid language plpgsql security definer set search_path='' as $$declare v_provider uuid;v_hash text;v_id uuid;begin select p.id,s.secret_hash into v_provider,v_hash from public.payment_providers p join public.payment_provider_settings s on s.provider_id=p.id and s.setting_key='webhook_secret' where p.code=p_provider and p.is_active;if v_provider is null or v_hash is null or extensions.crypt(p_provider_secret,v_hash)<>v_hash then raise exception 'webhook_auth_failed' using errcode='42501';end if;insert into public.payment_webhooks(provider_id,external_event_id,event_type,signature_valid,payload_hash,payload_summary,status,processed_at)values(v_provider,p_external_event_id,p_event_type,true,p_payload_hash,coalesce(p_payload_summary,'{}'),'processed',timezone('utc',now()))on conflict(provider_id,external_event_id)do update set retry_count=payment_webhooks.retry_count+1 returning id into v_id;insert into public.analytics_events(event_name,entity_type,entity_id,payload)values(case when p_event_type like '%refund%' then 'payment_refunded' when p_event_type like '%fail%' then 'payment_failed' else 'payment_verified' end,'payment_webhook',v_id::text,jsonb_build_object('provider',p_provider,'event_type',p_event_type))on conflict do nothing;insert into public.notification_events(event_type,entity_type,entity_id,payload,status,processed_at)values('payment_webhook_processed','payment',v_id::text,jsonb_build_object('provider',p_provider,'event_type',p_event_type),'processed',timezone('utc',now()));return v_id;end $$;
create or replace function public.admin_create_payment_refund(p_transaction_id uuid,p_provider_id uuid,p_amount numeric,p_reason text)
returns uuid language plpgsql security definer set search_path='' as $$declare v_tx public.payment_transactions%rowtype;v_id uuid;begin if not public.is_admin() then raise exception 'admin_required' using errcode='42501';end if;select*into v_tx from public.payment_transactions where id=p_transaction_id for update;if not found or p_amount<=0 or p_amount>v_tx.amount then raise exception 'invalid_refund' using errcode='22023';end if;insert into public.payment_refunds(payment_transaction_id,order_id,provider_id,refund_type,amount,reason,requested_by)values(v_tx.id,v_tx.order_id,p_provider_id,case when p_amount=v_tx.amount then'full'else'partial'end,p_amount,nullif(trim(p_reason),''),auth.uid())returning id into v_id;perform public.write_audit_log('payment_refund_requested','payment',v_id::text,'Refund',null,jsonb_build_object('amount',p_amount),jsonb_build_object('order_id',v_tx.order_id));return v_id;end $$;
revoke all on function public.admin_update_payment_provider(uuid,boolean,text),public.admin_set_payment_provider_secret(uuid,text,text,text),public.admin_create_payment_refund(uuid,uuid,numeric,text) from public,anon;grant execute on function public.admin_update_payment_provider(uuid,boolean,text),public.admin_set_payment_provider_secret(uuid,text,text,text),public.admin_create_payment_refund(uuid,uuid,numeric,text) to authenticated;
revoke all on function public.record_payment_webhook(text,text,text,text,jsonb,text) from public;grant execute on function public.record_payment_webhook(text,text,text,text,jsonb,text) to anon,authenticated;

create or replace function public.record_payment_gateway_event(p_event text,p_provider text,p_reference text,p_status text,p_metadata jsonb)
returns boolean language plpgsql security definer set search_path='' as $$begin if auth.uid() is null then raise exception 'authentication_required' using errcode='42501';end if;if p_event not in('payment_started','payment_verified','payment_failed','payment_refunded','payment_cancelled')then raise exception 'invalid_event' using errcode='22023';end if;insert into public.analytics_events(event_name,entity_type,entity_id,user_id,payload)values(p_event,'payment',p_reference,auth.uid(),jsonb_build_object('provider',p_provider,'status',p_status))on conflict do nothing;insert into public.notification_events(event_type,entity_type,entity_id,payload,status,processed_at)values(p_event,'payment',p_reference,jsonb_build_object('provider',p_provider,'status',p_status),'processed',timezone('utc',now()));if public.is_admin() then perform public.write_audit_log(p_event,'payment',p_reference,p_provider,null,null,coalesce(p_metadata,'{}'));end if;return true;end $$;
revoke all on function public.record_payment_gateway_event(text,text,text,text,jsonb) from public,anon;grant execute on function public.record_payment_gateway_event(text,text,text,text,jsonb) to authenticated;

drop trigger if exists audit_payment_providers_changes on public.payment_providers;create trigger audit_payment_providers_changes after insert or update or delete on public.payment_providers for each row execute function public.audit_row_change('payment','payment');
drop trigger if exists audit_payment_webhooks_changes on public.payment_webhooks;create trigger audit_payment_webhooks_changes after insert or update or delete on public.payment_webhooks for each row execute function public.audit_row_change('payment','payment');
drop trigger if exists audit_payment_refunds_changes on public.payment_refunds;create trigger audit_payment_refunds_changes after insert or update or delete on public.payment_refunds for each row execute function public.audit_row_change('payment','payment');

-- ============================================================================
-- SOURCE: supabase/migrations/202607250008_shipping_carrier_gateway.sql
-- ============================================================================
alter table public.shipments add column if not exists external_shipment_id text;
alter table public.shipments add column if not exists idempotency_key text;
alter table public.shipments add column if not exists provider_status text;
alter table public.shipments add column if not exists last_synced_at timestamptz;
create unique index if not exists shipments_provider_external_unique on public.shipments(provider_key, external_shipment_id) where external_shipment_id is not null;
create unique index if not exists shipments_idempotency_unique on public.shipments(idempotency_key) where idempotency_key is not null;

alter table public.shipment_events add column if not exists external_event_id text;
alter table public.shipment_events add column if not exists event_hash text;
alter table public.shipment_events add column if not exists metadata jsonb not null default '{}'::jsonb;
create unique index if not exists shipment_events_external_unique on public.shipment_events(shipment_id, external_event_id) where external_event_id is not null;
create unique index if not exists shipment_events_hash_unique on public.shipment_events(shipment_id, event_hash) where event_hash is not null;

create table if not exists public.shipping_provider_settings (
  id uuid primary key default gen_random_uuid(),
  carrier_id uuid not null references public.shipping_carriers(id) on delete cascade,
  provider_key text not null check(provider_key in ('manual','mock','yurtici','aras','mng','surat','ptt','hepsijet')),
  environment text not null default 'sandbox' check(environment in ('sandbox','production')),
  is_active boolean not null default false,
  configuration_reference text,
  webhook_secret_hash text,
  health_status text not null default 'unknown' check(health_status in ('unknown','healthy','degraded','down')),
  last_health_check_at timestamptz, last_success_at timestamptz, last_error_at timestamptz,
  created_at timestamptz not null default timezone('utc',now()), updated_at timestamptz not null default timezone('utc',now()),
  unique(carrier_id), unique(provider_key),
  check(configuration_reference is null or configuration_reference ~ '^[A-Z][A-Z0-9_]{2,100}$')
);
create table if not exists public.shipping_webhooks (
  id uuid primary key default gen_random_uuid(), provider_key text not null, external_event_id text not null, event_type text not null,
  tracking_number text, shipment_id uuid references public.shipments(id) on delete set null, payload_summary jsonb not null default '{}'::jsonb,
  payload_hash text not null, signature_valid boolean not null default false, status text not null default 'received' check(status in ('received','processing','processed','failed','ignored')),
  retry_count integer not null default 0 check(retry_count>=0), received_at timestamptz not null default timezone('utc',now()), processed_at timestamptz,
  last_error text, created_at timestamptz not null default timezone('utc',now()), unique(provider_key,external_event_id), unique(provider_key,payload_hash)
);
create table if not exists public.shipping_labels (
  id uuid primary key default gen_random_uuid(), shipment_id uuid not null references public.shipments(id) on delete cascade, provider_key text not null,
  label_format text not null check(label_format in ('pdf','zpl','png','html')), storage_path text, content_hash text not null,
  status text not null default 'ready' check(status in ('pending','ready','invalidated','failed')),
  created_at timestamptz not null default timezone('utc',now()), updated_at timestamptz not null default timezone('utc',now()),
  unique(shipment_id,label_format,content_hash), check(storage_path is null or storage_path !~ '^https?://')
);
create table if not exists public.shipping_rate_quotes (
  id uuid primary key default gen_random_uuid(), provider_key text not null, order_id uuid references public.orders(id) on delete cascade,
  warehouse_id uuid not null references public.warehouses(id) on delete restrict, destination_postal_code text not null,
  package_count integer not null check(package_count>0), total_weight numeric(10,3) not null check(total_weight>0), desi numeric(10,2) not null check(desi>0),
  amount numeric(12,2) not null check(amount>=0), currency text not null default 'TRY' check(currency='TRY'),
  estimated_delivery_min integer not null check(estimated_delivery_min>=0), estimated_delivery_max integer not null check(estimated_delivery_max>=estimated_delivery_min),
  expires_at timestamptz not null, created_at timestamptz not null default timezone('utc',now())
);
create table if not exists public.shipping_sync_jobs (
  id uuid primary key default gen_random_uuid(), shipment_id uuid references public.shipments(id) on delete cascade, provider_key text not null,
  job_type text not null check(job_type in ('tracking_sync','label_create','shipment_create','shipment_cancel','health_check')),
  status text not null default 'pending' check(status in ('pending','processing','completed','failed','cancelled')),
  attempt_count integer not null default 0 check(attempt_count between 0 and 10), scheduled_at timestamptz not null default timezone('utc',now()),
  started_at timestamptz, completed_at timestamptz, last_error text, created_at timestamptz not null default timezone('utc',now())
);

create index if not exists shipping_webhooks_received_idx on public.shipping_webhooks(received_at desc,provider_key,status);
create index if not exists shipping_labels_shipment_idx on public.shipping_labels(shipment_id,status);
create index if not exists shipping_rate_quotes_expiry_idx on public.shipping_rate_quotes(expires_at,provider_key);
create index if not exists shipping_sync_jobs_schedule_idx on public.shipping_sync_jobs(status,scheduled_at);

insert into public.shipping_carriers(name,code,provider_key,description,is_active,is_default,supports_api) values
('Mock Kargo','MOCK','mock','Yalnızca sandbox testleri için mock sağlayıcı',true,false,true),
('Yurtiçi Kargo','YURTICI','yurtici','Entegrasyon hazır değil',false,false,true),('Aras Kargo','ARAS','aras','Entegrasyon hazır değil',false,false,true),
('MNG Kargo','MNG','mng','Entegrasyon hazır değil',false,false,true),('Sürat Kargo','SURAT','surat','Entegrasyon hazır değil',false,false,true),
('PTT Kargo','PTT','ptt','Entegrasyon hazır değil',false,false,true),('Hepsijet','HEPSIJET','hepsijet','Entegrasyon hazır değil',false,false,true)
on conflict(code) do nothing;
insert into public.shipping_provider_settings(carrier_id,provider_key,environment,is_active)
select id,provider_key,'sandbox',provider_key='mock' from public.shipping_carriers where provider_key in ('mock','yurtici','aras','mng','surat','ptt','hepsijet') on conflict(provider_key) do nothing;

alter table public.shipping_provider_settings enable row level security; alter table public.shipping_webhooks enable row level security;
alter table public.shipping_labels enable row level security; alter table public.shipping_rate_quotes enable row level security; alter table public.shipping_sync_jobs enable row level security;
revoke all on public.shipping_provider_settings,public.shipping_webhooks,public.shipping_labels,public.shipping_rate_quotes,public.shipping_sync_jobs from anon,authenticated;
grant select on public.shipping_provider_settings,public.shipping_webhooks,public.shipping_labels,public.shipping_rate_quotes,public.shipping_sync_jobs to authenticated;
create policy "Admins read shipping providers" on public.shipping_provider_settings for select to authenticated using(public.is_admin());
create policy "Admins read shipping webhooks" on public.shipping_webhooks for select to authenticated using(public.is_admin());
create policy "Admins read shipping labels" on public.shipping_labels for select to authenticated using(public.is_admin());
create policy "Admins read shipping rates" on public.shipping_rate_quotes for select to authenticated using(public.is_admin());
create policy "Admins read shipping jobs" on public.shipping_sync_jobs for select to authenticated using(public.is_admin());

create or replace function public.admin_update_shipping_provider(p_id uuid,p_active boolean,p_environment text) returns boolean language plpgsql security definer set search_path='' as $$
begin if not public.is_admin() then raise exception 'admin_required' using errcode='42501'; end if; if p_environment not in ('sandbox','production') then raise exception 'invalid_environment'; end if;
update public.shipping_provider_settings set is_active=p_active,environment=p_environment,updated_at=timezone('utc',now()) where id=p_id;
perform public.write_audit_log('shipping_provider_updated','shipment',p_id::text,'Shipping provider',null,jsonb_build_object('is_active',p_active,'environment',p_environment),'{}'); return found; end $$;
create or replace function public.admin_set_shipping_webhook_secret(p_id uuid,p_secret text) returns boolean language plpgsql security definer set search_path='' as $$
begin if not public.is_admin() then raise exception 'admin_required'; end if; if length(p_secret)<16 then raise exception 'weak_secret'; end if; update public.shipping_provider_settings set webhook_secret_hash=extensions.crypt(p_secret,extensions.gen_salt('bf')),updated_at=timezone('utc',now()) where id=p_id; return found; end $$;

create or replace function public.create_shipping_sync_job(p_shipment_id uuid,p_provider_key text,p_job_type text) returns uuid language plpgsql security definer set search_path='' as $$ declare v_id uuid;
begin if not public.is_admin() then raise exception 'admin_required'; end if; insert into public.shipping_sync_jobs(shipment_id,provider_key,job_type) values(p_shipment_id,p_provider_key,p_job_type) returning id into v_id; return v_id; end $$;
create or replace function public.admin_retry_shipping_job(p_job_id uuid) returns boolean language plpgsql security definer set search_path='' as $$
begin if not public.is_admin() then raise exception 'admin_required'; end if; update public.shipping_sync_jobs set status='pending',attempt_count=attempt_count+1,scheduled_at=timezone('utc',now()),started_at=null,completed_at=null,last_error=null where id=p_job_id and status='failed' and attempt_count<5; perform public.write_audit_log('shipment_sync_retried','shipment',p_job_id::text,'Shipping sync',null,null,'{}'); return found; end $$;
create or replace function public.admin_create_mock_shipment(p_order_id uuid,p_carrier_id uuid,p_items jsonb,p_idempotency_key text,p_package jsonb default '{}'::jsonb) returns uuid language plpgsql security definer set search_path='' as $$ declare v_id uuid;
begin if not public.is_admin() then raise exception 'admin_required'; end if; if exists(select 1 from public.shipments where idempotency_key=p_idempotency_key) then raise exception 'shipment_already_exists'; end if;
v_id:=public.create_manual_shipment(p_order_id,p_carrier_id,p_items,null,null,p_package,0,'Mock gateway shipment'); update public.shipments set provider_key='mock',idempotency_key=p_idempotency_key,external_shipment_id='MOCK-'||replace(v_id::text,'-',''),tracking_number='MCK'||upper(substr(replace(v_id::text,'-',''),1,12)),provider_status='created' where id=v_id;
insert into public.shipping_sync_jobs(shipment_id,provider_key,job_type,status,completed_at) values(v_id,'mock','shipment_create','completed',timezone('utc',now())); return v_id; end $$;
create or replace function public.admin_cancel_provider_shipment(p_shipment_id uuid) returns boolean language plpgsql security definer set search_path='' as $$ begin if not public.is_admin() then raise exception 'admin_required'; end if; perform public.update_shipment_status(p_shipment_id,'cancelled','Provider gönderisi iptal edildi',null); insert into public.shipping_sync_jobs(shipment_id,provider_key,job_type,status,completed_at) select id,provider_key,'shipment_cancel','completed',timezone('utc',now()) from public.shipments where id=p_shipment_id; return true; end $$;
create or replace function public.register_shipping_webhook(p_provider_key text,p_external_event_id text,p_event_type text,p_tracking_number text,p_payload_hash text,p_payload_summary jsonb,p_signature_valid boolean,p_provider_secret text) returns uuid language plpgsql security definer set search_path='' as $$ declare v_id uuid; v_hash text; begin if not p_signature_valid then raise exception 'invalid_webhook_signature'; end if; select webhook_secret_hash into v_hash from public.shipping_provider_settings where provider_key=p_provider_key and is_active; if v_hash is null or extensions.crypt(p_provider_secret,v_hash)<>v_hash then raise exception 'invalid_webhook_signature'; end if;
insert into public.shipping_webhooks(provider_key,external_event_id,event_type,tracking_number,payload_hash,payload_summary,signature_valid) values(p_provider_key,p_external_event_id,p_event_type,nullif(p_tracking_number,''),p_payload_hash,coalesce(p_payload_summary,'{}'),true) on conflict(provider_key,external_event_id) do update set retry_count=shipping_webhooks.retry_count+1 returning id into v_id; return v_id; exception when unique_violation then raise exception 'webhook_replayed'; end $$;
create or replace function public.upsert_shipping_tracking_event(p_shipment_id uuid,p_external_event_id text,p_status text,p_raw_status text,p_title text,p_description text,p_location text,p_occurred_at timestamptz,p_event_hash text) returns boolean language plpgsql security definer set search_path='' as $$
begin insert into public.shipment_events(shipment_id,status,title,description,location,event_time,provider_event_code,external_event_id,event_hash,metadata) values(p_shipment_id,p_status,p_title,nullif(p_description,''),nullif(p_location,''),p_occurred_at,p_raw_status,p_external_event_id,p_event_hash,jsonb_build_object('raw_status',p_raw_status)) on conflict do nothing; update public.shipments set status=p_status,provider_status=p_raw_status,last_synced_at=timezone('utc',now()),delivered_at=case when p_status='delivered' then coalesce(delivered_at,p_occurred_at) else delivered_at end where id=p_shipment_id; perform public.recalculate_order_fulfillment((select order_id from public.shipments where id=p_shipment_id)); return true; end $$;
create or replace function public.complete_shipping_webhook(p_webhook_id uuid,p_shipment_id uuid,p_status text,p_error text default null) returns boolean language plpgsql security definer set search_path='' as $$ begin update public.shipping_webhooks set shipment_id=p_shipment_id,status=p_status,processed_at=timezone('utc',now()),last_error=case when p_error is null then null else 'İşlem tamamlanamadı' end where id=p_webhook_id; return found; end $$;

revoke all on function public.admin_update_shipping_provider(uuid,boolean,text),public.admin_set_shipping_webhook_secret(uuid,text),public.create_shipping_sync_job(uuid,text,text),public.admin_retry_shipping_job(uuid),public.admin_create_mock_shipment(uuid,uuid,jsonb,text,jsonb),public.admin_cancel_provider_shipment(uuid) from public,anon;
grant execute on function public.admin_update_shipping_provider(uuid,boolean,text),public.admin_set_shipping_webhook_secret(uuid,text),public.create_shipping_sync_job(uuid,text,text),public.admin_retry_shipping_job(uuid),public.admin_create_mock_shipment(uuid,uuid,jsonb,text,jsonb),public.admin_cancel_provider_shipment(uuid) to authenticated;
revoke all on function public.register_shipping_webhook(text,text,text,text,text,jsonb,boolean,text),public.complete_shipping_webhook(uuid,uuid,text,text),public.upsert_shipping_tracking_event(uuid,text,text,text,text,text,text,timestamptz,text) from public;
grant execute on function public.register_shipping_webhook(text,text,text,text,text,jsonb,boolean,text) to anon,authenticated;
grant execute on function public.complete_shipping_webhook(uuid,uuid,text,text),public.upsert_shipping_tracking_event(uuid,text,text,text,text,text,text,timestamptz,text) to authenticated;

drop trigger if exists audit_shipping_provider_settings_changes on public.shipping_provider_settings; create trigger audit_shipping_provider_settings_changes after insert or update or delete on public.shipping_provider_settings for each row execute function public.audit_row_change('shipment','shipment');
drop trigger if exists audit_shipping_labels_changes on public.shipping_labels; create trigger audit_shipping_labels_changes after insert or update or delete on public.shipping_labels for each row execute function public.audit_row_change('shipment','shipment');

-- ============================================================================
-- SOURCE: supabase/migrations/202607250009_manual_shipping_experience.sql
-- ============================================================================
alter table public.shipping_carriers add column if not exists estimated_delivery_days integer not null default 3 check(estimated_delivery_days between 1 and 30);
alter table public.shipping_carriers add column if not exists free_shipping_label text not null default 'Sipariş koşullarına göre ücretsiz';
alter table public.shipping_carriers add column if not exists customer_description text;
alter table public.orders add column if not exists selected_shipping_provider text;
alter table public.orders add column if not exists selected_shipping_name text;
alter table public.orders add column if not exists estimated_delivery_days integer check(estimated_delivery_days between 1 and 30);
alter table public.orders add column if not exists shipping_note text;
alter table public.shipments drop constraint if exists shipment_status;
alter table public.shipments add constraint shipment_status check(status in('pending','preparing','ready_for_shipment','shipped','in_transit','out_for_delivery','delivered','delivery_failed','return_started','returned','cancelled'));
alter table public.shipment_events drop constraint if exists shipment_event_status;
alter table public.shipment_events add constraint shipment_event_status check(status in('pending','preparing','ready_for_shipment','shipped','in_transit','out_for_delivery','delivered','delivery_failed','return_started','returned','cancelled'));

update public.shipping_carriers set estimated_delivery_days=case provider_key when 'hepsijet' then 2 when 'yurtici' then 2 when 'aras' then 3 when 'mng' then 3 when 'surat' then 3 when 'ptt' then 4 else 3 end,
free_shipping_label='2.500 TL üzeri ücretsiz',customer_description=coalesce(customer_description,'Türkiye geneli güvenli teslimat')
where provider_key in ('yurtici','mng','aras','surat','ptt','hepsijet');
update public.shipping_carriers set is_default=false where is_default;
update public.shipping_carriers set is_active=true,is_default=(provider_key='yurtici') where provider_key in ('yurtici','mng','aras','surat','ptt','hepsijet');

create or replace function public.create_order(p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_order_id uuid; v_order_number text; v_item jsonb; v_pricing jsonb; v_shipping numeric(12,2); v_total numeric(12,2); v_tax numeric(12,2);
  v_delivery text := p_payload->>'delivery_method'; v_payment text := p_payload->>'payment_method'; v_carrier public.shipping_carriers%rowtype;
begin
  if coalesce(p_payload->'delivery_address'->>'email','')='' or coalesce(p_payload->'delivery_address'->>'phone','')='' then raise exception 'invalid_contact'; end if;
  if v_delivery not in ('standard','express','store') or v_payment not in ('card','transfer','cash') then raise exception 'invalid_method'; end if;
  select * into v_carrier from public.shipping_carriers where provider_key=p_payload->>'selected_shipping_provider' and is_active;
  if not found or v_carrier.provider_key not in ('yurtici','mng','aras','surat','ptt','hepsijet') then raise exception 'invalid_shipping_provider'; end if;
  v_pricing := public.compute_order_pricing(p_payload->'items',p_payload->>'coupon_code',true);
  loop v_order_number := 'CG-'||extract(year from timezone('utc',now()))::text||'-'||lpad(floor(random()*100000000)::bigint::text,8,'0'); exit when not exists(select 1 from public.orders where order_number=v_order_number); end loop;
  v_shipping := case when v_delivery='express' then 199 when (v_pricing->>'payable_subtotal')::numeric<2500 and v_delivery='standard' then 149 else 0 end;
  v_total := greatest(0,(v_pricing->>'payable_subtotal')::numeric+v_shipping); v_tax := round(v_total-(v_total/1.20),2);
  insert into public.orders(order_number,user_id,status,payment_method,payment_status,delivery_method,subtotal,discount_total,shipping_total,tax_total,grand_total,delivery_address,billing_address,status_history,coupon_snapshot,campaign_snapshots,selected_shipping_provider,selected_shipping_name,estimated_delivery_days,shipping_note,shipping_method_snapshot)
  values(v_order_number,auth.uid(),'received',v_payment,'pending',v_delivery,(v_pricing->>'subtotal')::numeric,(v_pricing->>'discount_total')::numeric,v_shipping,v_tax,v_total,p_payload->'delivery_address',p_payload->'billing_address',jsonb_build_array(jsonb_build_object('status','received','label','Sipariş alındı','at',timezone('utc',now()))),v_pricing->'coupon',v_pricing->'campaigns',v_carrier.provider_key,v_carrier.name,v_carrier.estimated_delivery_days,nullif(trim(p_payload->>'shipping_note'),''),jsonb_build_object('code',v_delivery,'carrier_id',v_carrier.id,'provider',v_carrier.provider_key,'name',v_carrier.name,'estimated_delivery_days',v_carrier.estimated_delivery_days,'note',nullif(trim(p_payload->>'shipping_note'),''))) returning id into v_order_id;
  for v_item in select value from jsonb_array_elements(v_pricing->'items') loop insert into public.order_items(order_id,product_id,product_name,sku,quantity,unit_price,discount_total,line_total,product_snapshot) values(v_order_id,(v_item->>'product_id')::uuid,v_item->>'name',v_item->>'sku',(v_item->>'quantity')::integer,(v_item->>'unit_price')::numeric,0,(v_item->>'line_subtotal')::numeric,jsonb_build_object('slug',v_item->>'slug','image_url',v_item->>'image_url')); end loop;
  if v_pricing->'coupon' is not null then insert into public.coupon_usages(coupon_id,user_id,order_id) values((v_pricing->'coupon'->>'id')::uuid,auth.uid(),v_order_id); end if;
  return jsonb_build_object('id',v_order_id,'order_number',v_order_number,'grand_total',v_total,'subtotal',(v_pricing->>'subtotal')::numeric,'discount_total',(v_pricing->>'discount_total')::numeric,'campaign_discount',(v_pricing->>'campaign_discount')::numeric,'coupon_discount',(v_pricing->>'coupon_discount')::numeric,'created_at',timezone('utc',now()));
end;$$;

create or replace function public.admin_update_shipping_experience(p_carrier_id uuid,p_is_active boolean,p_is_default boolean,p_estimated_days integer,p_free_label text,p_description text,p_logo_url text) returns boolean language plpgsql security definer set search_path='' as $$
begin if not public.is_admin() then raise exception 'admin_required'; end if; if p_estimated_days not between 1 and 30 then raise exception 'invalid_estimate'; end if;
if p_is_default then update public.shipping_carriers set is_default=false where is_default; end if;
update public.shipping_carriers set is_active=p_is_active,is_default=p_is_default,estimated_delivery_days=p_estimated_days,free_shipping_label=left(trim(p_free_label),120),customer_description=left(trim(p_description),240),logo_url=nullif(trim(p_logo_url),'') where id=p_carrier_id;
perform public.write_audit_log('shipping_carrier_updated','shipment',p_carrier_id::text,'Shipping carrier',null,jsonb_build_object('is_active',p_is_active,'is_default',p_is_default,'estimated_days',p_estimated_days),'{}'); return found; end $$;

create or replace function public.admin_update_manual_shipment(p_shipment_id uuid,p_carrier_id uuid,p_tracking_number text,p_tracking_url text,p_shipping_note text,p_estimated_at timestamptz,p_status text) returns boolean language plpgsql security definer set search_path='' as $$
declare v_old public.shipments%rowtype; v_carrier public.shipping_carriers%rowtype; v_label text; v_customer uuid;
begin if not public.is_admin() then raise exception 'admin_required'; end if; if p_status not in ('preparing','shipped','in_transit','out_for_delivery','delivered','delivery_failed','return_started','returned','cancelled') then raise exception 'invalid_status'; end if;
select * into v_old from public.shipments where id=p_shipment_id for update; if not found then raise exception 'shipment_not_found'; end if; select * into v_carrier from public.shipping_carriers where id=p_carrier_id and is_active; if not found then raise exception 'inactive_carrier'; end if;
if nullif(trim(p_tracking_url),'') is not null and trim(p_tracking_url) not like 'https://%' then raise exception 'invalid_tracking_url'; end if;
v_label:=case p_status when 'preparing' then 'Hazırlanıyor' when 'shipped' then 'Kargoya verildi' when 'in_transit' then 'Transfer sürecinde' when 'out_for_delivery' then 'Dağıtıma çıktı' when 'delivered' then 'Teslim edildi' when 'delivery_failed' then 'Teslim edilemedi' when 'return_started' then 'İade sürecinde' when 'returned' then 'İade edildi' else 'İptal edildi' end;
update public.shipments set carrier_id=v_carrier.id,provider_key=v_carrier.provider_key,carrier_snapshot=jsonb_build_object('name',v_carrier.name,'code',v_carrier.code,'logo_url',v_carrier.logo_url),tracking_number=nullif(trim(p_tracking_number),''),tracking_url=nullif(trim(p_tracking_url),''),admin_note=nullif(trim(p_shipping_note),''),estimated_delivery_at=p_estimated_at,status=p_status,shipped_at=case when p_status='shipped' then coalesce(shipped_at,timezone('utc',now())) else shipped_at end,delivered_at=case when p_status='delivered' then coalesce(delivered_at,timezone('utc',now())) else delivered_at end where id=p_shipment_id;
if v_old.status<>p_status then insert into public.shipment_events(shipment_id,status,title,description,created_by) values(p_shipment_id,p_status,v_label,'Manuel operasyon güncellemesi',auth.uid()); end if;
insert into public.notification_events(event_type,entity_type,entity_id,payload,status) values(case when v_old.tracking_number is distinct from nullif(trim(p_tracking_number),'') then 'shipment_tracking_added' else 'shipment_status_changed' end,'shipment',p_shipment_id::text,jsonb_build_object('status',p_status,'tracking_number',nullif(trim(p_tracking_number),'')),'pending');
insert into public.analytics_events(event_name,entity_type,entity_id,payload) values(case when p_status='delivered' then 'shipment_delivered' when p_status='returned' then 'shipment_returned' else 'shipment_status_changed' end,'shipment',p_shipment_id::text,jsonb_build_object('status',p_status)) on conflict do nothing;
select cp.id into v_customer from public.customer_profiles cp join public.orders o on o.user_id=cp.user_id where o.id=v_old.order_id; if v_customer is not null and (v_old.tracking_number is distinct from nullif(trim(p_tracking_number),'') or p_status in ('shipped','delivered','return_started','returned')) then insert into public.customer_activity(customer_id,activity_type,description,metadata) values(v_customer,'shipment_update',v_label,jsonb_build_object('shipment_id',p_shipment_id,'status',p_status)); end if;
perform public.write_audit_log('shipment_updated','shipment',p_shipment_id::text,v_old.shipment_number,to_jsonb(v_old)-'recipient_snapshot',jsonb_build_object('carrier_id',p_carrier_id,'tracking_number',nullif(trim(p_tracking_number),''),'tracking_url',nullif(trim(p_tracking_url),''),'status',p_status),jsonb_build_object('order_id',v_old.order_id)); perform public.recalculate_order_fulfillment(v_old.order_id); return true; end $$;

revoke all on function public.admin_update_shipping_experience(uuid,boolean,boolean,integer,text,text,text),public.admin_update_manual_shipment(uuid,uuid,text,text,text,timestamptz,text) from public,anon;
grant execute on function public.admin_update_shipping_experience(uuid,boolean,boolean,integer,text,text,text),public.admin_update_manual_shipment(uuid,uuid,text,text,text,timestamptz,text) to authenticated;
revoke all on function public.create_order(jsonb) from public; grant execute on function public.create_order(jsonb) to anon,authenticated;

-- ============================================================================
-- SOURCE: supabase/migrations/202607250010_promotions_coupon_engine.sql
-- ============================================================================
alter table public.coupons add column if not exists title text;
alter table public.coupons add column if not exists priority integer not null default 100 check(priority between 0 and 10000);
alter table public.coupons add column if not exists is_stackable boolean not null default false;
alter table public.coupons drop constraint if exists coupons_discount_type_check;
alter table public.coupons add constraint coupons_discount_type_check check(discount_type in ('percentage','fixed','free_shipping'));
alter table public.coupons drop constraint if exists coupons_discount_value_check;
alter table public.coupons add constraint coupons_discount_value_check check((discount_type='free_shipping' and discount_value=0) or (discount_type<>'free_shipping' and discount_value>0));
update public.coupons set title=coalesce(title,description,code) where title is null;
alter table public.coupons alter column title set not null;

create table if not exists public.coupon_redemptions(
 id uuid primary key default gen_random_uuid(),coupon_id uuid not null references public.coupons(id) on delete restrict,user_id uuid references auth.users(id) on delete set null,
 order_id uuid references public.orders(id) on delete cascade,reservation_token uuid not null default gen_random_uuid(),status text not null default 'reserved' check(status in('reserved','redeemed','released','cancelled')),
 discount_amount numeric(12,2) not null default 0 check(discount_amount>=0),reserved_at timestamptz not null default timezone('utc',now()),redeemed_at timestamptz,released_at timestamptz,
 created_at timestamptz not null default timezone('utc',now()),updated_at timestamptz not null default timezone('utc',now()),unique(reservation_token),unique(order_id)
);
create table if not exists public.promotion_rules(
 id uuid primary key default gen_random_uuid(),coupon_id uuid not null references public.coupons(id) on delete cascade,name text not null,target_type text not null check(target_type in('all','category','brand','product','user','customer_segment','first_order')),
 target_id text,is_active boolean not null default true,priority integer not null default 100,created_at timestamptz not null default timezone('utc',now()),updated_at timestamptz not null default timezone('utc',now())
);
create table if not exists public.promotion_conditions(
 id uuid primary key default gen_random_uuid(),rule_id uuid not null references public.promotion_rules(id) on delete cascade,condition_type text not null check(condition_type in('minimum_amount','category','brand','product','user','customer_segment','first_order')),
 operator text not null default 'equals' check(operator in('equals','in','gte','lte')),configuration jsonb not null default '{}'::jsonb,created_at timestamptz not null default timezone('utc',now()),updated_at timestamptz not null default timezone('utc',now())
);
create table if not exists public.promotion_usage_logs(
 id uuid primary key default gen_random_uuid(),coupon_id uuid references public.coupons(id) on delete set null,order_id uuid references public.orders(id) on delete set null,user_id uuid references auth.users(id) on delete set null,
 event_type text not null check(event_type in('validated','validation_failed','reserved','redeemed','released','expired','applied','removed')),discount_amount numeric(12,2) not null default 0,
 metadata jsonb not null default '{}'::jsonb,created_at timestamptz not null default timezone('utc',now())
);

alter table public.orders add column if not exists coupon_code text;
alter table public.orders add column if not exists coupon_name text;
alter table public.orders add column if not exists coupon_type text;
alter table public.orders add column if not exists coupon_discount_amount numeric(12,2) not null default 0;
alter table public.orders add column if not exists coupon_discount_percentage numeric(7,2);
alter table public.orders add column if not exists free_shipping boolean not null default false;
alter table public.orders add column if not exists promotion_snapshot jsonb not null default '{}'::jsonb;

create index if not exists coupons_engine_lookup_idx on public.coupons(code,is_active,starts_at,ends_at,priority);
create index if not exists coupon_redemptions_usage_idx on public.coupon_redemptions(coupon_id,status,user_id);
create index if not exists promotion_rules_coupon_idx on public.promotion_rules(coupon_id,is_active,priority);
create index if not exists promotion_conditions_rule_idx on public.promotion_conditions(rule_id,condition_type);
create index if not exists promotion_usage_logs_coupon_idx on public.promotion_usage_logs(coupon_id,created_at desc);

alter table public.coupon_redemptions enable row level security;alter table public.promotion_rules enable row level security;alter table public.promotion_conditions enable row level security;alter table public.promotion_usage_logs enable row level security;
revoke all on public.coupon_redemptions,public.promotion_rules,public.promotion_conditions,public.promotion_usage_logs from anon,authenticated;
grant select on public.coupon_redemptions,public.promotion_rules,public.promotion_conditions,public.promotion_usage_logs to authenticated;
create policy "Admins read coupon redemptions" on public.coupon_redemptions for select to authenticated using(public.is_admin());
create policy "Users read own coupon redemptions" on public.coupon_redemptions for select to authenticated using(user_id=auth.uid());
create policy "Admins read promotion rules" on public.promotion_rules for select to authenticated using(public.is_admin());
create policy "Admins read promotion conditions" on public.promotion_conditions for select to authenticated using(public.is_admin());
create policy "Admins read promotion logs" on public.promotion_usage_logs for select to authenticated using(public.is_admin());

create or replace function public.admin_create_coupon(p_coupon jsonb) returns uuid language plpgsql security definer set search_path='' as $$declare v_id uuid;begin if not public.is_admin() then raise exception 'admin_required';end if;
insert into public.coupons(code,title,description,discount_type,discount_value,minimum_order_amount,maximum_discount_amount,usage_limit,usage_limit_per_user,starts_at,ends_at,is_active,priority,is_stackable)
values(upper(trim(p_coupon->>'code')),trim(coalesce(p_coupon->>'title',p_coupon->>'code')),nullif(trim(p_coupon->>'description'),''),p_coupon->>'discount_type',coalesce((p_coupon->>'discount_value')::numeric,0),coalesce((p_coupon->>'minimum_order_amount')::numeric,0),nullif(p_coupon->>'maximum_discount_amount','')::numeric,nullif(p_coupon->>'usage_limit','')::integer,nullif(p_coupon->>'usage_limit_per_user','')::integer,(p_coupon->>'starts_at')::timestamptz,(p_coupon->>'ends_at')::timestamptz,coalesce((p_coupon->>'is_active')::boolean,true),coalesce((p_coupon->>'priority')::integer,100),coalesce((p_coupon->>'is_stackable')::boolean,false)) returning id into v_id;
perform public.write_audit_log('coupon_created','coupon',v_id::text,p_coupon->>'code',null,p_coupon,'{}');insert into public.notification_events(event_type,entity_type,entity_id,payload,status)values('coupon_created','coupon',v_id::text,jsonb_build_object('code',upper(trim(p_coupon->>'code'))),'pending');return v_id;end $$;
create or replace function public.admin_update_coupon(p_coupon_id uuid,p_coupon jsonb) returns boolean language plpgsql security definer set search_path='' as $$declare v_old jsonb;begin if not public.is_admin() then raise exception 'admin_required';end if;select to_jsonb(c) into v_old from public.coupons c where id=p_coupon_id for update;if v_old is null then return false;end if;
update public.coupons set code=upper(trim(p_coupon->>'code')),title=trim(coalesce(p_coupon->>'title',p_coupon->>'code')),description=nullif(trim(p_coupon->>'description'),''),discount_type=p_coupon->>'discount_type',discount_value=coalesce((p_coupon->>'discount_value')::numeric,0),minimum_order_amount=coalesce((p_coupon->>'minimum_order_amount')::numeric,0),maximum_discount_amount=nullif(p_coupon->>'maximum_discount_amount','')::numeric,usage_limit=nullif(p_coupon->>'usage_limit','')::integer,usage_limit_per_user=nullif(p_coupon->>'usage_limit_per_user','')::integer,starts_at=(p_coupon->>'starts_at')::timestamptz,ends_at=(p_coupon->>'ends_at')::timestamptz,is_active=coalesce((p_coupon->>'is_active')::boolean,true),priority=coalesce((p_coupon->>'priority')::integer,100),is_stackable=coalesce((p_coupon->>'is_stackable')::boolean,false) where id=p_coupon_id;
perform public.write_audit_log('coupon_updated','coupon',p_coupon_id::text,p_coupon->>'code',v_old,p_coupon,'{}');return true;end $$;
create or replace function public.admin_delete_coupon(p_coupon_id uuid) returns boolean language plpgsql security definer set search_path='' as $$begin if not public.is_admin() then raise exception 'admin_required';end if;update public.coupons set is_active=false where id=p_coupon_id;perform public.write_audit_log('coupon_deleted','coupon',p_coupon_id::text,'Coupon',null,jsonb_build_object('is_active',false),'{}');return found;end $$;

create or replace function public.validate_coupon(p_code text,p_items jsonb) returns jsonb language plpgsql security definer set search_path='' as $$declare v_coupon public.coupons%rowtype;v_result jsonb;v_rules int;v_match int;begin
select * into v_coupon from public.coupons where code=upper(trim(p_code));if not found or not v_coupon.is_active or v_coupon.starts_at>timezone('utc',now()) or v_coupon.ends_at<timezone('utc',now()) then insert into public.promotion_usage_logs(coupon_id,user_id,event_type,metadata)values(v_coupon.id,auth.uid(),'validation_failed',jsonb_build_object('reason','invalid'));return jsonb_build_object('valid',false,'error','coupon_invalid');end if;
select count(*) into v_rules from public.promotion_rules where coupon_id=v_coupon.id and is_active;if v_rules>0 then select count(*) into v_match from public.promotion_rules r where r.coupon_id=v_coupon.id and r.is_active and (r.target_type='all' or(r.target_type='user' and r.target_id=auth.uid()::text)or(r.target_type='first_order' and auth.uid() is not null and not exists(select 1 from public.orders where user_id=auth.uid()))or(r.target_type='category' and exists(select 1 from jsonb_array_elements(p_items)i join public.products p on p.sku=i->>'sku' where p.category_id::text=r.target_id))or(r.target_type='brand' and exists(select 1 from jsonb_array_elements(p_items)i join public.products p on p.sku=i->>'sku' where p.brand_id::text=r.target_id))or(r.target_type='product' and exists(select 1 from jsonb_array_elements(p_items)i join public.products p on p.sku=i->>'sku' where p.id::text=r.target_id))or(r.target_type='customer_segment' and exists(select 1 from public.customer_profiles cp where cp.user_id=auth.uid() and cp.segment=r.target_id)));if v_match=0 then insert into public.promotion_usage_logs(coupon_id,user_id,event_type,metadata)values(v_coupon.id,auth.uid(),'validation_failed',jsonb_build_object('reason','rules'));return jsonb_build_object('valid',false,'error','coupon_not_applicable');end if;end if;
v_result:=public.compute_order_pricing(p_items,v_coupon.code,false);insert into public.promotion_usage_logs(coupon_id,user_id,event_type,discount_amount)values(v_coupon.id,auth.uid(),'validated',coalesce((v_result->>'coupon_discount')::numeric,0));return v_result||jsonb_build_object('valid',true,'free_shipping',v_coupon.discount_type='free_shipping');exception when others then return jsonb_build_object('valid',false,'error','coupon_invalid');end $$;

create or replace function public.redeem_coupon(p_coupon_id uuid,p_order_id uuid,p_discount numeric) returns uuid language plpgsql security definer set search_path='' as $$declare v_coupon public.coupons%rowtype;v_id uuid;v_total int;v_user int;begin select * into v_coupon from public.coupons where id=p_coupon_id for update;if not found or not v_coupon.is_active then raise exception 'coupon_invalid';end if;select count(*) into v_total from public.coupon_redemptions where coupon_id=p_coupon_id and status in('reserved','redeemed');if v_coupon.usage_limit is not null and v_total>=v_coupon.usage_limit then raise exception 'coupon_limit';end if;select count(*) into v_user from public.coupon_redemptions where coupon_id=p_coupon_id and user_id=auth.uid() and status in('reserved','redeemed');if v_coupon.usage_limit_per_user is not null and v_user>=v_coupon.usage_limit_per_user then raise exception 'coupon_user_limit';end if;insert into public.coupon_redemptions(coupon_id,user_id,order_id,status,discount_amount,redeemed_at)values(p_coupon_id,auth.uid(),p_order_id,'redeemed',greatest(0,p_discount),timezone('utc',now()))returning id into v_id;insert into public.promotion_usage_logs(coupon_id,order_id,user_id,event_type,discount_amount)values(p_coupon_id,p_order_id,auth.uid(),'redeemed',greatest(0,p_discount));return v_id;end $$;
create or replace function public.release_coupon(p_order_id uuid) returns boolean language plpgsql security definer set search_path='' as $$
declare v_allowed boolean; v_updated boolean;
begin
  v_allowed := public.current_user_is_admin() or exists(
    select 1 from public.orders o where o.id=p_order_id and o.user_id=auth.uid()
  );
  if not v_allowed then raise exception 'forbidden'; end if;
  update public.coupon_redemptions set status='released',released_at=timezone('utc',now()) where order_id=p_order_id and status in('reserved','redeemed');
  v_updated := found;
  insert into public.promotion_usage_logs(coupon_id,order_id,user_id,event_type,discount_amount)
  select coupon_id,order_id,user_id,'released',discount_amount from public.coupon_redemptions where order_id=p_order_id;
  perform public.write_audit_log('coupon_released','coupon',p_order_id::text,'Coupon redemption',null,null,'{}');
  return v_updated;
end $$;

create or replace function public.sync_coupon_order_snapshot() returns trigger language plpgsql security definer set search_path='' as $$declare v_coupon public.coupons%rowtype;v_amount numeric;begin select * into v_coupon from public.coupons where id=new.coupon_id;select coalesce((coupon_snapshot->>'amount')::numeric,0) into v_amount from public.orders where id=new.order_id;update public.orders set coupon_code=v_coupon.code,coupon_name=v_coupon.title,coupon_type=v_coupon.discount_type,coupon_discount_amount=v_amount,coupon_discount_percentage=case when v_coupon.discount_type='percentage' then v_coupon.discount_value end,free_shipping=v_coupon.discount_type='free_shipping',promotion_snapshot=jsonb_build_object('coupon',coupon_snapshot,'campaigns',campaign_snapshots) where id=new.order_id;perform public.redeem_coupon(new.coupon_id,new.order_id,v_amount);insert into public.analytics_events(event_name,entity_type,entity_id,user_id,payload)values('coupon_applied','coupon',new.order_id::text,new.user_id,jsonb_build_object('code',v_coupon.code,'amount',v_amount))on conflict do nothing;insert into public.customer_activity(customer_id,activity_type,description,metadata)select cp.id,'coupon_used','Kupon kullanıldı',jsonb_build_object('code',v_coupon.code,'order_id',new.order_id) from public.customer_profiles cp where cp.user_id=new.user_id;return new;end $$;
drop trigger if exists coupon_usage_engine_sync on public.coupon_usages;create trigger coupon_usage_engine_sync after insert on public.coupon_usages for each row execute function public.sync_coupon_order_snapshot();

revoke all on function public.admin_create_coupon(jsonb),public.admin_update_coupon(uuid,jsonb),public.admin_delete_coupon(uuid) from public,anon;grant execute on function public.admin_create_coupon(jsonb),public.admin_update_coupon(uuid,jsonb),public.admin_delete_coupon(uuid) to authenticated;
revoke all on function public.validate_coupon(text,jsonb),public.redeem_coupon(uuid,uuid,numeric),public.release_coupon(uuid) from public;grant execute on function public.validate_coupon(text,jsonb) to anon,authenticated;grant execute on function public.release_coupon(uuid) to authenticated;

-- ============================================================================
-- SOURCE: supabase/migrations/202607250011_returns_rma_management.sql
-- ============================================================================
create table if not exists public.return_requests (
  id uuid primary key default gen_random_uuid(),
  rma_number text not null unique default ('RMA-' || to_char(timezone('utc',now()),'YYYY') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  order_id uuid not null references public.orders(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'new' check (status in ('new','reviewing','awaiting_photos','approved','rejected','awaiting_product','product_received','inspected','refund_approved','exchange_approved','refund_completed','exchange_completed','cancelled')),
  request_type text not null default 'return' check (request_type in ('return','exchange','warranty')),
  reason text not null check (reason in ('wrong_product','damaged_product','missing_product','shipping_damage','changed_mind','defective_product','warranty','other')),
  description text not null check (char_length(trim(description)) between 10 and 4000),
  internal_note text,
  customer_note text,
  closed_at timestamptz,
  created_at timestamptz not null default timezone('utc',now()), updated_at timestamptz not null default timezone('utc',now())
);
create table if not exists public.return_request_items (
  id uuid primary key default gen_random_uuid(), return_request_id uuid not null references public.return_requests(id) on delete cascade,
  order_item_id uuid not null references public.order_items(id) on delete restrict, quantity integer not null check(quantity>0),
  resolution text check(resolution is null or resolution in ('refund','exchange','repair','reject')),
  created_at timestamptz not null default timezone('utc',now()), updated_at timestamptz not null default timezone('utc',now()), unique(return_request_id,order_item_id)
);
create table if not exists public.return_messages (
  id uuid primary key default gen_random_uuid(), return_request_id uuid not null references public.return_requests(id) on delete cascade,
  sender_user_id uuid not null references auth.users(id) on delete restrict, sender_role text not null check(sender_role in ('customer','admin')),
  message text not null check(char_length(trim(message)) between 1 and 4000), is_internal boolean not null default false,
  created_at timestamptz not null default timezone('utc',now()), updated_at timestamptz not null default timezone('utc',now())
);
create table if not exists public.return_attachments (
  id uuid primary key default gen_random_uuid(), return_request_id uuid not null references public.return_requests(id) on delete cascade,
  message_id uuid references public.return_messages(id) on delete set null, uploaded_by uuid not null references auth.users(id) on delete restrict,
  storage_path text not null unique, file_name text not null, mime_type text not null check(mime_type in ('image/jpeg','image/png','image/webp','video/mp4','video/webm','application/pdf')),
  file_size bigint not null check(file_size>0 and file_size<=52428800), created_at timestamptz not null default timezone('utc',now()), updated_at timestamptz not null default timezone('utc',now())
);
create table if not exists public.return_status_history (
  id uuid primary key default gen_random_uuid(), return_request_id uuid not null references public.return_requests(id) on delete cascade,
  from_status text, to_status text not null, changed_by uuid not null references auth.users(id) on delete restrict, note text,
  created_at timestamptz not null default timezone('utc',now()), updated_at timestamptz not null default timezone('utc',now())
);
create index if not exists return_requests_user_created_idx on public.return_requests(user_id,created_at desc);
create index if not exists return_requests_order_idx on public.return_requests(order_id);
create index if not exists return_requests_status_created_idx on public.return_requests(status,created_at desc);
create index if not exists return_items_request_idx on public.return_request_items(return_request_id);
create index if not exists return_messages_request_created_idx on public.return_messages(return_request_id,created_at);
create index if not exists return_history_request_created_idx on public.return_status_history(return_request_id,created_at);

alter table public.return_requests enable row level security; alter table public.return_request_items enable row level security;
alter table public.return_messages enable row level security; alter table public.return_attachments enable row level security; alter table public.return_status_history enable row level security;
create policy return_requests_owner_admin_read on public.return_requests for select using(user_id=auth.uid() or public.current_user_is_admin());
create policy return_items_owner_admin_read on public.return_request_items for select using(exists(select 1 from public.return_requests r where r.id=return_request_id and (r.user_id=auth.uid() or public.current_user_is_admin())));
create policy return_messages_owner_admin_read on public.return_messages for select using(not is_internal and exists(select 1 from public.return_requests r where r.id=return_request_id and r.user_id=auth.uid()) or public.current_user_is_admin());
create policy return_attachments_owner_admin_read on public.return_attachments for select using(public.current_user_is_admin() or (exists(select 1 from public.return_requests r where r.id=return_request_id and r.user_id=auth.uid()) and (message_id is null or exists(select 1 from public.return_messages m where m.id=message_id and not m.is_internal))));
create policy return_history_owner_admin_read on public.return_status_history for select using(exists(select 1 from public.return_requests r where r.id=return_request_id and (r.user_id=auth.uid() or public.current_user_is_admin())));
revoke insert,update,delete on public.return_requests,public.return_request_items,public.return_messages,public.return_attachments,public.return_status_history from anon,authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('return-attachments','return-attachments',false,52428800,array['image/jpeg','image/png','image/webp','video/mp4','video/webm','application/pdf']) on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy return_storage_owner_admin_read on storage.objects for select to authenticated using(bucket_id='return-attachments' and (public.current_user_is_admin() or (storage.foldername(name))[1]=auth.uid()::text));
create policy return_storage_owner_upload on storage.objects for insert to authenticated with check(bucket_id='return-attachments' and (storage.foldername(name))[1]=auth.uid()::text);
create policy return_storage_owner_admin_delete on storage.objects for delete to authenticated using(bucket_id='return-attachments' and (public.current_user_is_admin() or (storage.foldername(name))[1]=auth.uid()::text));

create or replace function public.create_return_request(p_order_id uuid,p_reason text,p_description text,p_items jsonb,p_request_type text default 'return') returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_item jsonb; v_user uuid:=auth.uid();
begin
 if v_user is null or not exists(select 1 from public.orders where id=p_order_id and user_id=v_user) then raise exception 'forbidden'; end if;
 if jsonb_array_length(coalesce(p_items,'[]'::jsonb))=0 then raise exception 'items_required'; end if;
 insert into public.return_requests(order_id,user_id,reason,description,request_type) values(p_order_id,v_user,p_reason,trim(p_description),p_request_type) returning id into v_id;
 for v_item in select * from jsonb_array_elements(p_items) loop
  if not exists(select 1 from public.order_items oi where oi.id=(v_item->>'order_item_id')::uuid and oi.order_id=p_order_id and (v_item->>'quantity')::int between 1 and oi.quantity) then raise exception 'invalid_item'; end if;
  insert into public.return_request_items(return_request_id,order_item_id,quantity) values(v_id,(v_item->>'order_item_id')::uuid,(v_item->>'quantity')::int);
 end loop;
 insert into public.return_status_history(return_request_id,to_status,changed_by,note) values(v_id,'new',v_user,'Talep oluşturuldu');
 perform public.write_audit_log('return_created','order',v_id::text,'RMA',null,jsonb_build_object('order_id',p_order_id,'reason',p_reason),'{}');
 perform public.publish_notification_event('return_created','return',v_id::text,jsonb_build_object('user_id',v_user));
 insert into public.analytics_events(event_name,entity_type,entity_id,user_id,payload) values('return_request','return',v_id::text,v_user,jsonb_build_object('reason',p_reason)),('return_reason','return',v_id::text,v_user,jsonb_build_object('reason',p_reason));
 insert into public.customer_activity(customer_id,activity_type,description,metadata) select cp.id,'return_created','İade/değişim talebi oluşturuldu',jsonb_build_object('return_id',v_id) from public.customer_profiles cp where cp.user_id=v_user;
 return v_id;
end $$;
create or replace function public.update_return_status(p_return_id uuid,p_status text,p_internal_note text default null,p_customer_note text default null) returns boolean language plpgsql security definer set search_path='' as $$
declare v_old text; v_user uuid; begin if not public.current_user_is_admin() then raise exception 'forbidden'; end if;
 select status,user_id into v_old,v_user from public.return_requests where id=p_return_id for update; if not found then raise exception 'not_found'; end if;
 update public.return_requests set status=p_status,internal_note=coalesce(p_internal_note,internal_note),customer_note=coalesce(p_customer_note,customer_note),closed_at=case when p_status in('rejected','refund_completed','exchange_completed','cancelled') then timezone('utc',now()) else null end,updated_at=timezone('utc',now()) where id=p_return_id;
 insert into public.return_status_history(return_request_id,from_status,to_status,changed_by,note) values(p_return_id,v_old,p_status,auth.uid(),p_customer_note);
 perform public.write_audit_log('return_status_changed','order',p_return_id::text,'RMA',jsonb_build_object('status',v_old),jsonb_build_object('status',p_status),jsonb_build_object('internal_note',p_internal_note));
 perform public.publish_notification_event('return_status_changed','return',p_return_id::text,jsonb_build_object('user_id',v_user,'status',p_status));
 return true; end $$;
create or replace function public.add_return_message(p_return_id uuid,p_message text,p_is_internal boolean default false) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_owner uuid; v_admin boolean:=public.current_user_is_admin(); begin select user_id into v_owner from public.return_requests where id=p_return_id;
 if not found or (not v_admin and v_owner<>auth.uid()) or (p_is_internal and not v_admin) then raise exception 'forbidden'; end if;
 insert into public.return_messages(return_request_id,sender_user_id,sender_role,message,is_internal) values(p_return_id,auth.uid(),case when v_admin then 'admin' else 'customer' end,trim(p_message),p_is_internal) returning id into v_id;
 perform public.write_audit_log('return_message_added','order',p_return_id::text,'RMA message',null,null,jsonb_build_object('message_id',v_id,'internal',p_is_internal));
 if not p_is_internal then perform public.publish_notification_event('return_message_received','return',p_return_id::text,jsonb_build_object('recipient_user_id',case when v_admin then v_owner else null end)); end if; return v_id; end $$;
create or replace function public.close_return_request(p_return_id uuid,p_note text default null) returns boolean language plpgsql security definer set search_path='' as $$declare v_old text; begin
 if not public.current_user_is_admin() and not exists(select 1 from public.return_requests where id=p_return_id and user_id=auth.uid() and status in('new','reviewing','awaiting_photos')) then raise exception 'forbidden'; end if;
 select status into v_old from public.return_requests where id=p_return_id for update; if not found then raise exception 'not_found'; end if;
 update public.return_requests set status='cancelled',closed_at=timezone('utc',now()),updated_at=timezone('utc',now()) where id=p_return_id;
 insert into public.return_status_history(return_request_id,from_status,to_status,changed_by,note) values(p_return_id,v_old,'cancelled',auth.uid(),p_note);
 perform public.write_audit_log('return_closed','order',p_return_id::text,'RMA',null,jsonb_build_object('status','cancelled'),'{}'); return true; end $$;
create or replace function public.register_return_attachment(p_return_id uuid,p_storage_path text,p_file_name text,p_mime_type text,p_file_size bigint,p_message_id uuid default null) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid; begin
 if not exists(select 1 from public.return_requests r where r.id=p_return_id and (r.user_id=auth.uid() or public.current_user_is_admin())) then raise exception 'forbidden'; end if;
 if split_part(p_storage_path,'/',1)<>auth.uid()::text then raise exception 'invalid_path'; end if;
 insert into public.return_attachments(return_request_id,message_id,uploaded_by,storage_path,file_name,mime_type,file_size) values(p_return_id,p_message_id,auth.uid(),p_storage_path,p_file_name,p_mime_type,p_file_size) returning id into v_id;
 perform public.write_audit_log('return_attachment_uploaded','order',p_return_id::text,'RMA attachment',null,null,jsonb_build_object('attachment_id',v_id,'mime_type',p_mime_type)); return v_id;
end $$;
revoke all on function public.create_return_request(uuid,text,text,jsonb,text),public.update_return_status(uuid,text,text,text),public.add_return_message(uuid,text,boolean),public.close_return_request(uuid,text) from public,anon;
grant execute on function public.create_return_request(uuid,text,text,jsonb,text),public.update_return_status(uuid,text,text,text),public.add_return_message(uuid,text,boolean),public.close_return_request(uuid,text) to authenticated;
revoke all on function public.register_return_attachment(uuid,text,text,text,bigint,uuid) from public,anon;
grant execute on function public.register_return_attachment(uuid,text,text,text,bigint,uuid) to authenticated;

-- ============================================================================
-- SOURCE: supabase/migrations/202607250012_loyalty_rewards.sql
-- ============================================================================
create table if not exists public.loyalty_accounts(id uuid primary key default gen_random_uuid(),user_id uuid not null unique references auth.users(id) on delete cascade,available_points bigint not null default 0 check(available_points>=0),pending_points bigint not null default 0 check(pending_points>=0),lifetime_earned bigint not null default 0 check(lifetime_earned>=0),lifetime_redeemed bigint not null default 0 check(lifetime_redeemed>=0),created_at timestamptz not null default timezone('utc',now()),updated_at timestamptz not null default timezone('utc',now()));
create table if not exists public.reward_rules(id uuid primary key default gen_random_uuid(),name text not null,rule_type text not null check(rule_type in('purchase','first_order','birthday','category','brand','campaign')),points_per_try numeric(12,4) not null default 0 check(points_per_try>=0),bonus_points bigint not null default 0 check(bonus_points>=0),redemption_value_per_point numeric(12,4) not null default .01 check(redemption_value_per_point>0),minimum_order_amount numeric(12,2) not null default 0 check(minimum_order_amount>=0),maximum_redeemable_points bigint,category_id uuid references public.categories(id) on delete set null,brand_id uuid references public.brands(id) on delete set null,campaign_id uuid references public.campaigns(id) on delete set null,priority integer not null default 100,is_active boolean not null default true,starts_at timestamptz,ends_at timestamptz,created_at timestamptz not null default timezone('utc',now()),updated_at timestamptz not null default timezone('utc',now()));
create table if not exists public.loyalty_transactions(id uuid primary key default gen_random_uuid(),account_id uuid not null references public.loyalty_accounts(id) on delete restrict,user_id uuid not null references auth.users(id) on delete restrict,order_id uuid references public.orders(id) on delete set null,type text not null check(type in('earn','redeem','refund','adjustment','bonus','manual_add','manual_remove')),points bigint not null check(points<>0),balance_after bigint not null check(balance_after>=0),status text not null default 'completed' check(status in('pending','completed','cancelled')),description text,metadata jsonb not null default '{}'::jsonb,idempotency_key text unique,created_at timestamptz not null default timezone('utc',now()),updated_at timestamptz not null default timezone('utc',now()));
create table if not exists public.reward_redemptions(id uuid primary key default gen_random_uuid(),account_id uuid not null references public.loyalty_accounts(id) on delete restrict,user_id uuid not null references auth.users(id) on delete restrict,order_id uuid not null references public.orders(id) on delete restrict,points bigint not null check(points>0),discount_amount numeric(12,2) not null check(discount_amount>=0),status text not null default 'redeemed' check(status in('reserved','redeemed','refunded','cancelled')),created_at timestamptz not null default timezone('utc',now()),updated_at timestamptz not null default timezone('utc',now()),unique(order_id));
alter table public.orders add column if not exists loyalty_points_earned bigint not null default 0,add column if not exists loyalty_points_redeemed bigint not null default 0,add column if not exists loyalty_discount numeric(12,2) not null default 0,add column if not exists loyalty_snapshot jsonb not null default '{}'::jsonb;
create index if not exists loyalty_transactions_user_created_idx on public.loyalty_transactions(user_id,created_at desc);create index if not exists loyalty_transactions_order_idx on public.loyalty_transactions(order_id);create index if not exists reward_rules_active_type_idx on public.reward_rules(is_active,rule_type,priority);create index if not exists reward_redemptions_user_created_idx on public.reward_redemptions(user_id,created_at desc);
alter table public.loyalty_accounts enable row level security;alter table public.loyalty_transactions enable row level security;alter table public.reward_rules enable row level security;alter table public.reward_redemptions enable row level security;
create policy loyalty_account_owner_admin_read on public.loyalty_accounts for select using(user_id=auth.uid() or public.current_user_is_admin());create policy loyalty_transactions_owner_admin_read on public.loyalty_transactions for select using(user_id=auth.uid() or public.current_user_is_admin());create policy reward_rules_authenticated_read on public.reward_rules for select using(auth.uid() is not null and (is_active or public.current_user_is_admin()));create policy reward_redemptions_owner_admin_read on public.reward_redemptions for select using(user_id=auth.uid() or public.current_user_is_admin());
revoke insert,update,delete on public.loyalty_accounts,public.loyalty_transactions,public.reward_rules,public.reward_redemptions from anon,authenticated;
insert into public.reward_rules(name,rule_type,points_per_try,redemption_value_per_point,minimum_order_amount,priority) select 'Standart alışveriş puanı','purchase',1,.01,1,100 where not exists(select 1 from public.reward_rules where rule_type='purchase');
create or replace function public.ensure_loyalty_account(p_user uuid) returns uuid language plpgsql security definer set search_path='' as $$declare v_id uuid;begin insert into public.loyalty_accounts(user_id)values(p_user)on conflict(user_id)do update set updated_at=public.loyalty_accounts.updated_at returning id into v_id;return v_id;end $$;
create or replace function public.earn_loyalty_points(p_user_id uuid,p_order_id uuid,p_points bigint default null,p_reason text default 'Sipariş kazanımı')returns bigint language plpgsql security definer set search_path='' as $$declare v_account uuid;v_points bigint;v_balance bigint;v_total numeric;begin if not public.current_user_is_admin() and auth.uid()<>p_user_id then raise exception'forbidden';end if;select grand_total into v_total from public.orders where id=p_order_id and user_id=p_user_id for update;if not found then raise exception'order_not_found';end if;select coalesce(p_points,floor(v_total*r.points_per_try)::bigint)into v_points from public.reward_rules r where r.rule_type='purchase'and r.is_active and v_total>=r.minimum_order_amount and (r.starts_at is null or r.starts_at<=now())and(r.ends_at is null or r.ends_at>=now())order by r.priority limit 1;v_points:=coalesce(v_points,0);if v_points<=0 then return 0;end if;v_account:=public.ensure_loyalty_account(p_user_id);update public.loyalty_accounts set available_points=available_points+v_points,lifetime_earned=lifetime_earned+v_points,updated_at=now()where id=v_account returning available_points into v_balance;insert into public.loyalty_transactions(account_id,user_id,order_id,type,points,balance_after,description,idempotency_key)values(v_account,p_user_id,p_order_id,'earn',v_points,v_balance,p_reason,'earn:'||p_order_id)on conflict(idempotency_key)do nothing;update public.orders set loyalty_points_earned=v_points,loyalty_snapshot=loyalty_snapshot||jsonb_build_object('earned',v_points)where id=p_order_id;perform public.publish_notification_event('points_earned','order',p_order_id::text,jsonb_build_object('user_id',p_user_id,'points',v_points));insert into public.analytics_events(event_name,entity_type,entity_id,user_id,payload)values('points_earned','order',p_order_id::text,p_user_id,jsonb_build_object('points',v_points));insert into public.customer_activity(customer_id,activity_type,description,metadata)select id,'loyalty_points_earned','Sadakat puanı kazanıldı',jsonb_build_object('points',v_points,'order_id',p_order_id)from public.customer_profiles where user_id=p_user_id;return v_points;exception when unique_violation then return 0;end $$;
create or replace function public.redeem_loyalty_points(p_points bigint,p_order_id uuid)returns numeric language plpgsql security definer set search_path='' as $$declare v_user uuid:=auth.uid();v_account public.loyalty_accounts%rowtype;v_max bigint;v_value numeric;v_discount numeric;v_total numeric;begin if v_user is null or p_points<=0 then raise exception'invalid_points';end if;select*into v_account from public.loyalty_accounts where user_id=v_user for update;if not found or v_account.available_points<p_points then raise exception'insufficient_points';end if;select grand_total into v_total from public.orders where id=p_order_id and user_id=v_user for update;if not found then raise exception'order_not_found';end if;select maximum_redeemable_points,redemption_value_per_point into v_max,v_value from public.reward_rules where rule_type='purchase'and is_active order by priority limit 1;if v_max is not null and p_points>v_max then raise exception'points_limit';end if;v_discount:=least(v_total,round(p_points*coalesce(v_value,.01),2));update public.loyalty_accounts set available_points=available_points-p_points,lifetime_redeemed=lifetime_redeemed+p_points,updated_at=now()where id=v_account.id;insert into public.loyalty_transactions(account_id,user_id,order_id,type,points,balance_after,description,idempotency_key)values(v_account.id,v_user,p_order_id,'redeem',-p_points,v_account.available_points-p_points,'Siparişte puan kullanımı','redeem:'||p_order_id);insert into public.reward_redemptions(account_id,user_id,order_id,points,discount_amount)values(v_account.id,v_user,p_order_id,p_points,v_discount);update public.orders set loyalty_points_redeemed=p_points,loyalty_discount=v_discount,discount_total=discount_total+v_discount,grand_total=greatest(0,grand_total-v_discount),loyalty_snapshot=jsonb_build_object('points',p_points,'discount',v_discount,'value_per_point',v_value)where id=p_order_id;perform public.publish_notification_event('points_used','order',p_order_id::text,jsonb_build_object('user_id',v_user,'points',p_points));insert into public.analytics_events(event_name,entity_type,entity_id,user_id,payload)values('points_used','order',p_order_id::text,v_user,jsonb_build_object('points',p_points,'discount',v_discount)),('reward_conversion','order',p_order_id::text,v_user,jsonb_build_object('points',p_points));perform public.write_audit_log('loyalty_points_used','order',p_order_id::text,'Loyalty redemption',null,jsonb_build_object('points',p_points,'discount',v_discount),'{}');return v_discount;end $$;
create or replace function public.refund_loyalty_points(p_order_id uuid)returns boolean language plpgsql security definer set search_path='' as $$declare v_r public.reward_redemptions%rowtype;v_balance bigint;begin if not public.current_user_is_admin() then raise exception'forbidden';end if;select*into v_r from public.reward_redemptions where order_id=p_order_id and status='redeemed'for update;if found then update public.loyalty_accounts set available_points=available_points+v_r.points,lifetime_redeemed=greatest(0,lifetime_redeemed-v_r.points),updated_at=now()where id=v_r.account_id returning available_points into v_balance;update public.reward_redemptions set status='refunded',updated_at=now()where id=v_r.id;insert into public.loyalty_transactions(account_id,user_id,order_id,type,points,balance_after,description,idempotency_key)values(v_r.account_id,v_r.user_id,p_order_id,'refund',v_r.points,v_balance,'İptal/iade puan geri yüklemesi','refund:'||p_order_id)on conflict do nothing;end if;return true;end $$;
create or replace function public.adjust_loyalty_points(p_user_id uuid,p_points bigint,p_reason text)returns bigint language plpgsql security definer set search_path='' as $$declare v_account uuid;v_balance bigint;begin if not public.current_user_is_admin()or p_points=0 then raise exception'forbidden';end if;v_account:=public.ensure_loyalty_account(p_user_id);update public.loyalty_accounts set available_points=available_points+p_points,lifetime_earned=lifetime_earned+greatest(p_points,0),updated_at=now()where id=v_account and available_points+p_points>=0 returning available_points into v_balance;if not found then raise exception'insufficient_points';end if;insert into public.loyalty_transactions(account_id,user_id,type,points,balance_after,description)values(v_account,p_user_id,case when p_points>0 then'manual_add'else'manual_remove'end,p_points,v_balance,p_reason);perform public.write_audit_log('loyalty_points_adjusted','user',p_user_id::text,'Loyalty account',null,jsonb_build_object('points',p_points,'balance',v_balance),jsonb_build_object('reason',p_reason));return v_balance;end $$;
create or replace function public.admin_save_reward_rule(p_rule jsonb)returns uuid language plpgsql security definer set search_path='' as $$declare v_id uuid;begin if not public.current_user_is_admin()then raise exception'forbidden';end if;v_id:=nullif(p_rule->>'id','')::uuid;insert into public.reward_rules(id,name,rule_type,points_per_try,bonus_points,redemption_value_per_point,minimum_order_amount,maximum_redeemable_points,priority,is_active)values(coalesce(v_id,gen_random_uuid()),p_rule->>'name',p_rule->>'rule_type',coalesce((p_rule->>'points_per_try')::numeric,0),coalesce((p_rule->>'bonus_points')::bigint,0),coalesce((p_rule->>'redemption_value_per_point')::numeric,.01),coalesce((p_rule->>'minimum_order_amount')::numeric,0),nullif(p_rule->>'maximum_redeemable_points','')::bigint,coalesce((p_rule->>'priority')::int,100),coalesce((p_rule->>'is_active')::boolean,true))on conflict(id)do update set name=excluded.name,rule_type=excluded.rule_type,points_per_try=excluded.points_per_try,bonus_points=excluded.bonus_points,redemption_value_per_point=excluded.redemption_value_per_point,minimum_order_amount=excluded.minimum_order_amount,maximum_redeemable_points=excluded.maximum_redeemable_points,priority=excluded.priority,is_active=excluded.is_active,updated_at=now()returning id into v_id;perform public.write_audit_log('reward_rule_updated','settings',v_id::text,p_rule->>'name',null,p_rule,'{}');return v_id;end $$;
alter function public.create_order(jsonb) rename to create_order_without_loyalty;
create or replace function public.create_order(p_payload jsonb)returns jsonb language plpgsql security definer set search_path='' as $$declare v_result jsonb;v_points bigint:=coalesce((p_payload->>'loyalty_points')::bigint,0);v_discount numeric:=0;v_order uuid;begin v_result:=public.create_order_without_loyalty(p_payload-'loyalty_points');v_order:=(v_result->>'id')::uuid;if v_points>0 then v_discount:=public.redeem_loyalty_points(v_points,v_order);select jsonb_build_object('id',id,'order_number',order_number,'grand_total',grand_total,'created_at',created_at,'subtotal',subtotal,'discount_total',discount_total,'campaign_discount',campaign_discount_total,'coupon_discount',coupon_discount_total,'loyalty_discount',loyalty_discount,'loyalty_points_redeemed',loyalty_points_redeemed)into v_result from public.orders where id=v_order;end if;return v_result;end $$;
create or replace function public.loyalty_order_status_trigger()returns trigger language plpgsql security definer set search_path='' as $$begin if new.status='delivered'and old.status is distinct from'delivered'and new.user_id is not null then perform public.earn_loyalty_points(new.user_id,new.id,null,'Teslim edilen sipariş');elsif new.status='cancelled'and old.status is distinct from'cancelled'then perform public.refund_loyalty_points(new.id);end if;return new;end $$;drop trigger if exists loyalty_order_status on public.orders;create trigger loyalty_order_status after update of status on public.orders for each row execute function public.loyalty_order_status_trigger();
revoke all on function public.ensure_loyalty_account(uuid),public.earn_loyalty_points(uuid,uuid,bigint,text),public.redeem_loyalty_points(bigint,uuid),public.refund_loyalty_points(uuid),public.adjust_loyalty_points(uuid,bigint,text),public.admin_save_reward_rule(jsonb)from public,anon;grant execute on function public.redeem_loyalty_points(bigint,uuid)to authenticated;grant execute on function public.adjust_loyalty_points(uuid,bigint,text),public.admin_save_reward_rule(jsonb)to authenticated;grant execute on function public.create_order(jsonb)to anon,authenticated;
-- Final idempotent earning implementation; repeated delivery events cannot credit twice.
create or replace function public.earn_loyalty_points(p_user_id uuid,p_order_id uuid,p_points bigint default null,p_reason text default 'Order reward')returns bigint language plpgsql security definer set search_path='' as $$
declare v_account uuid;v_points bigint;v_balance bigint;v_total numeric;v_bonus bigint:=0;
begin
 if not public.current_user_is_admin()and auth.uid()<>p_user_id then raise exception'forbidden';end if;
 if exists(select 1 from public.loyalty_transactions where idempotency_key='earn:'||p_order_id)then return 0;end if;
 select grand_total into v_total from public.orders where id=p_order_id and user_id=p_user_id for update;if not found then raise exception'order_not_found';end if;
 select coalesce(p_points,floor(v_total*r.points_per_try)::bigint)into v_points from public.reward_rules r where r.rule_type='purchase'and r.is_active and v_total>=r.minimum_order_amount and(r.starts_at is null or r.starts_at<=now())and(r.ends_at is null or r.ends_at>=now())order by r.priority limit 1;
 if not exists(select 1 from public.orders where user_id=p_user_id and id<>p_order_id and status='delivered')then select coalesce(max(bonus_points),0)into v_bonus from public.reward_rules where rule_type='first_order'and is_active;end if;
 v_bonus:=v_bonus+coalesce((select sum(r.bonus_points)from public.reward_rules r where r.is_active and r.rule_type in('category','brand','campaign')and(r.starts_at is null or r.starts_at<=now())and(r.ends_at is null or r.ends_at>=now())and((r.rule_type='category'and exists(select 1 from public.order_items oi join public.products p on p.id=oi.product_id where oi.order_id=p_order_id and p.category_id=r.category_id))or(r.rule_type='brand'and exists(select 1 from public.order_items oi join public.products p on p.id=oi.product_id where oi.order_id=p_order_id and p.brand_id=r.brand_id))or(r.rule_type='campaign'and exists(select 1 from public.orders o where o.id=p_order_id and o.campaign_snapshots @> jsonb_build_array(jsonb_build_object('id',r.campaign_id::text))))),0);
 v_points:=coalesce(v_points,0)+v_bonus;if v_points<=0 then return 0;end if;
 v_account:=public.ensure_loyalty_account(p_user_id);update public.loyalty_accounts set available_points=available_points+v_points,lifetime_earned=lifetime_earned+v_points,updated_at=now()where id=v_account returning available_points into v_balance;
 insert into public.loyalty_transactions(account_id,user_id,order_id,type,points,balance_after,description,idempotency_key,metadata)values(v_account,p_user_id,p_order_id,case when v_bonus>0 then'bonus'else'earn'end,v_points,v_balance,p_reason,'earn:'||p_order_id,jsonb_build_object('first_order_bonus',v_bonus));
 update public.orders set loyalty_points_earned=v_points,loyalty_snapshot=loyalty_snapshot||jsonb_build_object('earned',v_points,'first_order_bonus',v_bonus)where id=p_order_id;
 perform public.publish_notification_event(case when v_bonus>0 then'bonus_received'else'points_earned'end,'order',p_order_id::text,jsonb_build_object('user_id',p_user_id,'points',v_points));
 insert into public.analytics_events(event_name,entity_type,entity_id,user_id,payload)values('points_earned','order',p_order_id::text,p_user_id,jsonb_build_object('points',v_points));
 insert into public.customer_activity(customer_id,activity_type,description,metadata)select id,'loyalty_points_earned','Loyalty points earned',jsonb_build_object('points',v_points,'order_id',p_order_id)from public.customer_profiles where user_id=p_user_id;
 return v_points;
end $$;
-- Extra insertion guard protects all future idempotent transaction writers.
create or replace function public.guard_loyalty_earn_duplicate()returns trigger language plpgsql set search_path='' as $$begin if new.idempotency_key is not null and exists(select 1 from public.loyalty_transactions where idempotency_key=new.idempotency_key)then return null;end if;return new;end $$;
drop trigger if exists loyalty_transaction_duplicate_guard on public.loyalty_transactions;
create trigger loyalty_transaction_duplicate_guard before insert on public.loyalty_transactions for each row execute function public.guard_loyalty_earn_duplicate();
insert into public.loyalty_accounts(user_id)select id from public.profiles on conflict(user_id)do nothing;
create or replace function public.create_loyalty_account_for_profile()returns trigger language plpgsql security definer set search_path='' as $$begin insert into public.loyalty_accounts(user_id)values(new.id)on conflict(user_id)do nothing;return new;end $$;
drop trigger if exists profile_loyalty_account on public.profiles;
create trigger profile_loyalty_account after insert on public.profiles for each row execute function public.create_loyalty_account_for_profile();
create or replace function public.refund_loyalty_points(p_order_id uuid)returns boolean language plpgsql security definer set search_path='' as $$
declare v_r public.reward_redemptions%rowtype;v_account public.loyalty_accounts%rowtype;v_user uuid;v_earned bigint;v_reverse bigint;v_balance bigint;
begin
 if not public.current_user_is_admin()then raise exception'forbidden';end if;
 select user_id,loyalty_points_earned into v_user,v_earned from public.orders where id=p_order_id for update;if not found then raise exception'order_not_found';end if;
 select*into v_r from public.reward_redemptions where order_id=p_order_id and status='redeemed'for update;
 if found then update public.loyalty_accounts set available_points=available_points+v_r.points,lifetime_redeemed=greatest(0,lifetime_redeemed-v_r.points),updated_at=now()where id=v_r.account_id returning available_points into v_balance;update public.reward_redemptions set status='refunded',updated_at=now()where id=v_r.id;insert into public.loyalty_transactions(account_id,user_id,order_id,type,points,balance_after,description,idempotency_key)values(v_r.account_id,v_r.user_id,p_order_id,'refund',v_r.points,v_balance,'Redeemed points restored','refund:'||p_order_id)on conflict do nothing;end if;
 if v_user is not null and coalesce(v_earned,0)>0 and not exists(select 1 from public.loyalty_transactions where idempotency_key='earn-reversal:'||p_order_id)then select*into v_account from public.loyalty_accounts where user_id=v_user for update;v_reverse:=least(v_account.available_points,v_earned);if v_reverse>0 then update public.loyalty_accounts set available_points=available_points-v_reverse,lifetime_earned=greatest(0,lifetime_earned-v_reverse),updated_at=now()where id=v_account.id returning available_points into v_balance;insert into public.loyalty_transactions(account_id,user_id,order_id,type,points,balance_after,description,idempotency_key)values(v_account.id,v_user,p_order_id,'refund',-v_reverse,v_balance,'Earned points reversed','earn-reversal:'||p_order_id);end if;end if;
 perform public.write_audit_log('loyalty_points_refunded','order',p_order_id::text,'Loyalty refund',null,jsonb_build_object('earned_reversed',coalesce(v_reverse,0)),'{}');return true;
end $$;
create or replace function public.loyalty_order_status_trigger()returns trigger language plpgsql security definer set search_path='' as $$begin if new.status='delivered'and old.status is distinct from'delivered'and new.user_id is not null then perform public.earn_loyalty_points(new.user_id,new.id,null,'Delivered order');elsif(new.status='cancelled'and old.status is distinct from'cancelled')or(new.payment_status='refunded'and old.payment_status is distinct from'refunded')or(new.fulfillment_status='returned'and old.fulfillment_status is distinct from'returned')then perform public.refund_loyalty_points(new.id);end if;return new;end $$;
drop trigger if exists loyalty_order_status on public.orders;
create trigger loyalty_order_status after update of status,payment_status,fulfillment_status on public.orders for each row execute function public.loyalty_order_status_trigger();

-- ============================================================================
-- SOURCE: supabase/migrations/202607250013_gift_cards_store_credit.sql
-- ============================================================================
create table if not exists public.gift_cards(id uuid primary key default gen_random_uuid(),code text not null unique,title text not null,initial_balance numeric(12,2) not null check(initial_balance>0),balance numeric(12,2) not null check(balance>=0),currency text not null default'TRY'check(currency='TRY'),owner_user_id uuid references auth.users(id)on delete set null,starts_at timestamptz,ends_at timestamptz,is_active boolean not null default true,is_single_use boolean not null default false,gift_note text,created_by uuid references auth.users(id)on delete set null,created_at timestamptz not null default timezone('utc',now()),updated_at timestamptz not null default timezone('utc',now()));
create table if not exists public.gift_card_transactions(id uuid primary key default gen_random_uuid(),gift_card_id uuid not null references public.gift_cards(id)on delete restrict,user_id uuid references auth.users(id)on delete set null,order_id uuid references public.orders(id)on delete set null,type text not null check(type in('issue','redeem','topup','refund','adjustment')),amount numeric(12,2)not null check(amount<>0),balance_after numeric(12,2)not null check(balance_after>=0),description text,idempotency_key text unique,created_at timestamptz not null default timezone('utc',now()),updated_at timestamptz not null default timezone('utc',now()));
create table if not exists public.store_credit_accounts(id uuid primary key default gen_random_uuid(),user_id uuid not null unique references auth.users(id)on delete cascade,balance numeric(12,2)not null default 0 check(balance>=0),currency text not null default'TRY'check(currency='TRY'),lifetime_added numeric(12,2)not null default 0 check(lifetime_added>=0),lifetime_spent numeric(12,2)not null default 0 check(lifetime_spent>=0),created_at timestamptz not null default timezone('utc',now()),updated_at timestamptz not null default timezone('utc',now()));
create table if not exists public.store_credit_transactions(id uuid primary key default gen_random_uuid(),account_id uuid not null references public.store_credit_accounts(id)on delete restrict,user_id uuid not null references auth.users(id)on delete restrict,order_id uuid references public.orders(id)on delete set null,return_request_id uuid references public.return_requests(id)on delete set null,type text not null check(type in('load','spend','refund','bonus','adjustment')),amount numeric(12,2)not null check(amount<>0),balance_after numeric(12,2)not null check(balance_after>=0),description text,metadata jsonb not null default'{}'::jsonb,idempotency_key text unique,created_at timestamptz not null default timezone('utc',now()),updated_at timestamptz not null default timezone('utc',now()));
alter table public.orders add column if not exists gift_card_amount numeric(12,2)not null default 0,add column if not exists store_credit_amount numeric(12,2)not null default 0,add column if not exists gift_card_snapshot jsonb not null default'{}'::jsonb,add column if not exists store_credit_snapshot jsonb not null default'{}'::jsonb;
create index if not exists gift_cards_active_dates_idx on public.gift_cards(is_active,starts_at,ends_at);create index if not exists gift_cards_owner_idx on public.gift_cards(owner_user_id);create index if not exists gift_card_transactions_card_created_idx on public.gift_card_transactions(gift_card_id,created_at desc);create index if not exists store_credit_transactions_user_created_idx on public.store_credit_transactions(user_id,created_at desc);create index if not exists store_credit_transactions_order_idx on public.store_credit_transactions(order_id);
alter table public.gift_cards enable row level security;alter table public.gift_card_transactions enable row level security;alter table public.store_credit_accounts enable row level security;alter table public.store_credit_transactions enable row level security;
create policy gift_cards_owner_admin_read on public.gift_cards for select using(owner_user_id=auth.uid()or public.current_user_is_admin());create policy gift_card_transactions_owner_admin_read on public.gift_card_transactions for select using(user_id=auth.uid()or exists(select 1 from public.gift_cards g where g.id=gift_card_id and g.owner_user_id=auth.uid())or public.current_user_is_admin());create policy store_credit_owner_admin_read on public.store_credit_accounts for select using(user_id=auth.uid()or public.current_user_is_admin());create policy store_credit_transactions_owner_admin_read on public.store_credit_transactions for select using(user_id=auth.uid()or public.current_user_is_admin());
revoke insert,update,delete on public.gift_cards,public.gift_card_transactions,public.store_credit_accounts,public.store_credit_transactions from anon,authenticated;
insert into public.store_credit_accounts(user_id)select id from public.profiles on conflict(user_id)do nothing;
create or replace function public.ensure_store_credit_account(p_user uuid)returns uuid language plpgsql security definer set search_path=''as $$declare v_id uuid;begin insert into public.store_credit_accounts(user_id)values(p_user)on conflict(user_id)do update set updated_at=public.store_credit_accounts.updated_at returning id into v_id;return v_id;end $$;
create or replace function public.create_store_credit_for_profile()returns trigger language plpgsql security definer set search_path=''as $$begin perform public.ensure_store_credit_account(new.id);return new;end $$;drop trigger if exists profile_store_credit on public.profiles;create trigger profile_store_credit after insert on public.profiles for each row execute function public.create_store_credit_for_profile();
create or replace function public.create_gift_card(p_payload jsonb)returns uuid language plpgsql security definer set search_path=''as $$declare v_id uuid;v_code text;v_amount numeric;begin if not public.current_user_is_admin()then raise exception'forbidden';end if;v_amount:=(p_payload->>'balance')::numeric;if v_amount<=0 then raise exception'invalid_amount';end if;v_code:=upper(coalesce(nullif(trim(p_payload->>'code'),''),'CG-'||encode(gen_random_bytes(12),'hex')));insert into public.gift_cards(code,title,initial_balance,balance,currency,owner_user_id,starts_at,ends_at,is_active,is_single_use,gift_note,created_by)values(v_code,p_payload->>'title',v_amount,v_amount,coalesce(p_payload->>'currency','TRY'),nullif(p_payload->>'owner_user_id','')::uuid,nullif(p_payload->>'starts_at','')::timestamptz,nullif(p_payload->>'ends_at','')::timestamptz,coalesce((p_payload->>'is_active')::boolean,true),coalesce((p_payload->>'is_single_use')::boolean,false),p_payload->>'gift_note',auth.uid())returning id into v_id;insert into public.gift_card_transactions(gift_card_id,user_id,type,amount,balance_after,description,idempotency_key)values(v_id,nullif(p_payload->>'owner_user_id','')::uuid,'issue',v_amount,v_amount,'Gift card issued','issue:'||v_id);perform public.write_audit_log('gift_card_created','payment',v_id::text,v_code,null,jsonb_build_object('amount',v_amount),'{}');perform public.publish_notification_event('gift_card_created','gift_card',v_id::text,jsonb_build_object('user_id',p_payload->>'owner_user_id','title',p_payload->>'title'));return v_id;end $$;
create or replace function public.validate_gift_card(p_code text)returns jsonb language plpgsql security definer set search_path=''as $$declare g public.gift_cards%rowtype;begin select*into g from public.gift_cards where code=upper(trim(p_code))and is_active and balance>0 and(starts_at is null or starts_at<=now())and(ends_at is null or ends_at>=now());if not found then return jsonb_build_object('valid',false);end if;return jsonb_build_object('valid',true,'title',g.title,'balance',g.balance,'currency',g.currency);end $$;
create or replace function public.redeem_gift_card(p_code text,p_order_id uuid,p_amount numeric default null)returns numeric language plpgsql security definer set search_path=''as $$declare g public.gift_cards%rowtype;v_order numeric;v_amount numeric;v_balance numeric;begin select*into g from public.gift_cards where code=upper(trim(p_code))for update;if not found or not g.is_active or g.balance<=0 or(g.starts_at is not null and g.starts_at>now())or(g.ends_at is not null and g.ends_at<now())then raise exception'invalid_gift_card';end if;if exists(select 1 from public.gift_card_transactions where idempotency_key='redeem:'||p_order_id)then return 0;end if;select grand_total into v_order from public.orders where id=p_order_id for update;if not found then raise exception'order_not_found';end if;v_amount:=least(g.balance,v_order,coalesce(p_amount,g.balance));if v_amount<=0 then return 0;end if;update public.gift_cards set balance=balance-v_amount,is_active=case when is_single_use or balance-v_amount=0 then false else is_active end,updated_at=now()where id=g.id returning balance into v_balance;insert into public.gift_card_transactions(gift_card_id,user_id,order_id,type,amount,balance_after,description,idempotency_key)values(g.id,auth.uid(),p_order_id,'redeem',-v_amount,v_balance,'Order redemption','redeem:'||p_order_id);update public.orders set gift_card_amount=v_amount,grand_total=greatest(0,grand_total-v_amount),gift_card_snapshot=jsonb_build_object('gift_card_id',g.id,'code_suffix',right(g.code,4),'title',g.title,'amount',v_amount,'currency',g.currency)where id=p_order_id;insert into public.analytics_events(event_name,entity_type,entity_id,user_id,payload)values('gift_card_redeemed','order',p_order_id::text,auth.uid(),jsonb_build_object('amount',v_amount));perform public.publish_notification_event('gift_card_used','order',p_order_id::text,jsonb_build_object('user_id',auth.uid(),'amount',v_amount));perform public.write_audit_log('gift_card_used','payment',g.id::text,g.title,null,jsonb_build_object('amount',v_amount),jsonb_build_object('order_id',p_order_id));return v_amount;end $$;
create or replace function public.add_store_credit(p_user_id uuid,p_amount numeric,p_reason text,p_order_id uuid default null,p_return_id uuid default null)returns numeric language plpgsql security definer set search_path=''as $$declare v_id uuid;v_balance numeric;begin if not public.current_user_is_admin()or p_amount<=0 then raise exception'forbidden';end if;v_id:=public.ensure_store_credit_account(p_user_id);update public.store_credit_accounts set balance=balance+p_amount,lifetime_added=lifetime_added+p_amount,updated_at=now()where id=v_id returning balance into v_balance;insert into public.store_credit_transactions(account_id,user_id,order_id,return_request_id,type,amount,balance_after,description)values(v_id,p_user_id,p_order_id,p_return_id,'load',p_amount,v_balance,p_reason);perform public.publish_notification_event('store_credit_added','user',p_user_id::text,jsonb_build_object('user_id',p_user_id,'amount',p_amount));perform public.write_audit_log('store_credit_added','payment',v_id::text,'Store credit',null,jsonb_build_object('amount',p_amount,'balance',v_balance),jsonb_build_object('reason',p_reason));return v_balance;end $$;
create or replace function public.spend_store_credit(p_amount numeric,p_order_id uuid)returns numeric language plpgsql security definer set search_path=''as $$declare v_user uuid:=auth.uid();a public.store_credit_accounts%rowtype;v_order numeric;v_amount numeric;begin if v_user is null or p_amount<=0 then raise exception'invalid_amount';end if;if exists(select 1 from public.store_credit_transactions where idempotency_key='spend:'||p_order_id)then return 0;end if;select*into a from public.store_credit_accounts where user_id=v_user for update;if not found or a.balance<=0 then raise exception'insufficient_credit';end if;select grand_total into v_order from public.orders where id=p_order_id and user_id=v_user for update;if not found then raise exception'order_not_found';end if;v_amount:=least(p_amount,a.balance,v_order);update public.store_credit_accounts set balance=balance-v_amount,lifetime_spent=lifetime_spent+v_amount,updated_at=now()where id=a.id;insert into public.store_credit_transactions(account_id,user_id,order_id,type,amount,balance_after,description,idempotency_key)values(a.id,v_user,p_order_id,'spend',-v_amount,a.balance-v_amount,'Order spend','spend:'||p_order_id);update public.orders set store_credit_amount=v_amount,grand_total=greatest(0,grand_total-v_amount),store_credit_snapshot=jsonb_build_object('account_id',a.id,'amount',v_amount,'currency',a.currency)where id=p_order_id;insert into public.analytics_events(event_name,entity_type,entity_id,user_id,payload)values('store_credit_spent','order',p_order_id::text,v_user,jsonb_build_object('amount',v_amount));insert into public.customer_activity(customer_id,activity_type,description,metadata)select id,'store_credit_used','Store credit used',jsonb_build_object('amount',v_amount,'order_id',p_order_id)from public.customer_profiles where user_id=v_user;return v_amount;end $$;
create or replace function public.refund_store_credit(p_order_id uuid,p_amount numeric,p_reason text default'Refund to store credit',p_return_id uuid default null)returns numeric language plpgsql security definer set search_path=''as $$declare v_user uuid;v_id uuid;v_balance numeric;v_total numeric;begin if not public.current_user_is_admin()then raise exception'forbidden';end if;select user_id,grand_total+gift_card_amount+store_credit_amount into v_user,v_total from public.orders where id=p_order_id for update;if v_user is null or p_amount<=0 or p_amount>v_total then raise exception'invalid_refund';end if;v_id:=public.ensure_store_credit_account(v_user);if exists(select 1 from public.store_credit_transactions where idempotency_key='refund:'||p_order_id||':'||coalesce(p_return_id::text,'order'))then raise exception'already_refunded';end if;update public.store_credit_accounts set balance=balance+p_amount,lifetime_added=lifetime_added+p_amount,updated_at=now()where id=v_id returning balance into v_balance;insert into public.store_credit_transactions(account_id,user_id,order_id,return_request_id,type,amount,balance_after,description,idempotency_key)values(v_id,v_user,p_order_id,p_return_id,'refund',p_amount,v_balance,p_reason,'refund:'||p_order_id||':'||coalesce(p_return_id::text,'order'));insert into public.analytics_events(event_name,entity_type,entity_id,user_id,payload)values('refund_to_store_credit','order',p_order_id::text,v_user,jsonb_build_object('amount',p_amount));perform public.publish_notification_event('store_credit_added','order',p_order_id::text,jsonb_build_object('user_id',v_user,'amount',p_amount,'reason','refund'));perform public.write_audit_log('refund_to_store_credit','payment',v_id::text,'Store credit refund',null,jsonb_build_object('amount',p_amount),jsonb_build_object('order_id',p_order_id,'return_id',p_return_id));return v_balance;end $$;
create or replace function public.admin_update_gift_card(p_card_id uuid,p_action text,p_amount numeric default 0)returns boolean language plpgsql security definer set search_path=''as $$declare v_balance numeric;begin if not public.current_user_is_admin()then raise exception'forbidden';end if;if p_action='deactivate'then update public.gift_cards set is_active=false,updated_at=now()where id=p_card_id;elsif p_action='topup'and p_amount>0 then update public.gift_cards set balance=balance+p_amount,initial_balance=initial_balance+p_amount,updated_at=now()where id=p_card_id returning balance into v_balance;insert into public.gift_card_transactions(gift_card_id,user_id,type,amount,balance_after,description)values(p_card_id,auth.uid(),'topup',p_amount,v_balance,'Admin topup');else raise exception'invalid_action';end if;perform public.write_audit_log('gift_card_updated','payment',p_card_id::text,'Gift card',null,jsonb_build_object('action',p_action,'amount',p_amount),'{}');return found;end $$;
alter function public.create_order(jsonb)rename to create_order_without_credit;
create or replace function public.create_order(p_payload jsonb)returns jsonb language plpgsql security definer set search_path=''as $$declare r jsonb;v_id uuid;v_gift numeric:=0;v_credit numeric:=0;begin r:=public.create_order_without_credit(p_payload-'gift_card_code'-'gift_card_amount'-'store_credit_amount');v_id:=(r->>'id')::uuid;if nullif(trim(p_payload->>'gift_card_code'),'')is not null then v_gift:=public.redeem_gift_card(p_payload->>'gift_card_code',v_id,nullif(p_payload->>'gift_card_amount','')::numeric);end if;if coalesce((p_payload->>'store_credit_amount')::numeric,0)>0 then v_credit:=public.spend_store_credit((p_payload->>'store_credit_amount')::numeric,v_id);end if;select jsonb_build_object('id',id,'order_number',order_number,'grand_total',grand_total,'created_at',created_at,'subtotal',subtotal,'discount_total',discount_total,'campaign_discount',campaign_discount_total,'coupon_discount',coupon_discount_total,'loyalty_discount',loyalty_discount,'loyalty_points_redeemed',loyalty_points_redeemed,'gift_card_amount',gift_card_amount,'store_credit_amount',store_credit_amount)into r from public.orders where id=v_id;return r;end $$;
revoke all on function public.ensure_store_credit_account(uuid),public.create_gift_card(jsonb),public.redeem_gift_card(text,uuid,numeric),public.add_store_credit(uuid,numeric,text,uuid,uuid),public.spend_store_credit(numeric,uuid),public.refund_store_credit(uuid,numeric,text,uuid),public.admin_update_gift_card(uuid,text,numeric)from public,anon;grant execute on function public.validate_gift_card(text)to anon,authenticated;grant execute on function public.create_gift_card(jsonb),public.add_store_credit(uuid,numeric,text,uuid,uuid),public.refund_store_credit(uuid,numeric,text,uuid),public.admin_update_gift_card(uuid,text,numeric)to authenticated;grant execute on function public.create_order(jsonb)to anon,authenticated;
create or replace function public.credit_crm_event_trigger()returns trigger language plpgsql security definer set search_path=''as $$declare v_type text;begin if tg_table_name='gift_card_transactions'then v_type:=case when new.type='issue'then'gift_card_created'when new.type='redeem'then'gift_card_used'else null end;else v_type:=case when new.type in('load','refund','bonus')then'store_credit_added'when new.type='spend'then'store_credit_used'else null end;end if;if v_type is not null and new.user_id is not null then insert into public.customer_activity(customer_id,activity_type,description,metadata)select id,v_type,v_type,jsonb_build_object('amount',new.amount,'transaction_id',new.id)from public.customer_profiles where user_id=new.user_id;end if;if tg_table_name='store_credit_transactions'and new.type='spend'then perform public.publish_notification_event('store_credit_used','order',coalesce(new.order_id::text,new.id::text),jsonb_build_object('user_id',new.user_id,'amount',abs(new.amount)));perform public.write_audit_log('store_credit_used','payment',new.account_id::text,'Store credit',null,jsonb_build_object('amount',abs(new.amount)),jsonb_build_object('order_id',new.order_id));end if;return new;end $$;
drop trigger if exists gift_card_crm_event on public.gift_card_transactions;create trigger gift_card_crm_event after insert on public.gift_card_transactions for each row execute function public.credit_crm_event_trigger();drop trigger if exists store_credit_crm_event on public.store_credit_transactions;create trigger store_credit_crm_event after insert on public.store_credit_transactions for each row execute function public.credit_crm_event_trigger();

-- ============================================================================
-- SOURCE: supabase/migrations/202607250014_wishlist_alerts.sql
-- ============================================================================
-- Wishlist automation and customer alerts. Apply manually after review.
create type public.wishlist_alert_type as enum ('price_drop','back_in_stock','promotion_started');
create type public.wishlist_alert_status as enum ('pending','processing','completed','failed','cancelled');

create table public.wishlist_alert_preferences (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  price_drop boolean not null default false, back_in_stock boolean not null default false,
  promotion_started boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(user_id, product_id)
);
create table public.wishlist_alert_events (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  event_type public.wishlist_alert_type not null, idempotency_key text not null unique,
  payload jsonb not null default '{}'::jsonb, status public.wishlist_alert_status not null default 'pending',
  created_at timestamptz not null default now(), processed_at timestamptz, cancelled_at timestamptz
);
create table public.wishlist_alert_deliveries (
  id uuid primary key default gen_random_uuid(), event_id uuid not null references public.wishlist_alert_events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, channel text not null default 'in_app' check(channel in ('in_app','email','sms','push')),
  status public.wishlist_alert_status not null default 'pending', attempt_count integer not null default 0 check(attempt_count >= 0),
  last_error text, delivered_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(event_id, channel)
);
create table public.product_price_history (
  id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete cascade,
  old_price numeric(12,2) not null, new_price numeric(12,2) not null, change_percentage numeric(8,2) not null,
  source text not null default 'product_update', changed_at timestamptz not null default now(),
  check(old_price <> new_price)
);
create table public.product_stock_history (
  id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete cascade,
  old_stock integer not null, new_stock integer not null, old_status text not null, new_status text not null,
  warehouse_id uuid references public.warehouses(id) on delete set null, changed_at timestamptz not null default now(),
  check(old_stock <> new_stock)
);

create index wishlist_preferences_user_idx on public.wishlist_alert_preferences(user_id);
create index wishlist_preferences_product_idx on public.wishlist_alert_preferences(product_id);
create index wishlist_events_user_status_idx on public.wishlist_alert_events(user_id,status,created_at desc);
create index wishlist_events_product_type_idx on public.wishlist_alert_events(product_id,event_type,created_at desc);
create index wishlist_deliveries_status_idx on public.wishlist_alert_deliveries(status,created_at);
create index price_history_product_idx on public.product_price_history(product_id,changed_at desc);
create index stock_history_product_idx on public.product_stock_history(product_id,changed_at desc);

alter table public.wishlist_alert_preferences enable row level security;
alter table public.wishlist_alert_events enable row level security;
alter table public.wishlist_alert_deliveries enable row level security;
alter table public.product_price_history enable row level security;
alter table public.product_stock_history enable row level security;

create policy wishlist_preferences_own_read on public.wishlist_alert_preferences for select using (user_id = auth.uid());
create policy wishlist_events_own_or_admin_read on public.wishlist_alert_events for select using (user_id = auth.uid() or public.current_user_is_admin());
create policy wishlist_deliveries_own_or_admin_read on public.wishlist_alert_deliveries for select using (user_id = auth.uid() or public.current_user_is_admin());
create policy wishlist_price_history_admin_read on public.product_price_history for select using (public.current_user_is_admin());
create policy wishlist_stock_history_admin_read on public.product_stock_history for select using (public.current_user_is_admin());
grant select on public.wishlist_alert_preferences, public.wishlist_alert_events, public.wishlist_alert_deliveries to authenticated;
grant select on public.product_price_history, public.product_stock_history to authenticated;

create or replace function public.set_wishlist_alert_preference(p_product_id uuid,p_price_drop boolean,p_back_in_stock boolean,p_promotion_started boolean)
returns boolean language plpgsql security definer set search_path=public,auth as $$
begin
  if auth.uid() is null or not exists(select 1 from public.favorites where user_id=auth.uid() and product_id=p_product_id) then raise exception 'not_allowed'; end if;
  insert into public.wishlist_alert_preferences(user_id,product_id,price_drop,back_in_stock,promotion_started)
  values(auth.uid(),p_product_id,p_price_drop,p_back_in_stock,p_promotion_started)
  on conflict(user_id,product_id) do update set price_drop=excluded.price_drop,back_in_stock=excluded.back_in_stock,promotion_started=excluded.promotion_started,updated_at=now();
  insert into public.customer_activity(customer_id,activity_type,description,metadata)
  select id,case when p_price_drop or p_back_in_stock or p_promotion_started then 'wishlist_alert_enabled' else 'wishlist_alert_disabled' end,'Favori alarm tercihi güncellendi',jsonb_build_object('product_id',p_product_id) from public.customer_profiles where user_id=auth.uid();
  insert into public.analytics_events(event_name,user_id,entity_type,entity_id,payload)
  select case when p_price_drop then 'price_alert_enabled' when p_back_in_stock then 'stock_alert_enabled' else 'promotion_alert_enabled' end,auth.uid(),'product',p_product_id::text,jsonb_build_object('preference',true)
  where p_price_drop or p_back_in_stock or p_promotion_started;
  return true;
end $$;

create or replace function public.create_wishlist_alert_event(p_product_id uuid,p_event_type text,p_payload jsonb default '{}'::jsonb,p_idempotency_key text default '')
returns integer language plpgsql security definer set search_path=public,auth as $$
declare v_count integer:=0; v_pref record; v_event uuid;
begin
  if p_event_type not in ('price_drop','back_in_stock','promotion_started') then raise exception 'invalid_type'; end if;
  if auth.uid() is not null and not public.current_user_is_admin() then raise exception 'not_allowed'; end if;
  for v_pref in select * from public.wishlist_alert_preferences where product_id=p_product_id and case p_event_type when 'price_drop' then price_drop when 'back_in_stock' then back_in_stock else promotion_started end loop
    insert into public.wishlist_alert_events(user_id,product_id,event_type,idempotency_key,payload)
    values(v_pref.user_id,p_product_id,p_event_type::public.wishlist_alert_type,coalesce(nullif(p_idempotency_key,''),p_product_id::text||':'||p_event_type||':'||date_trunc('hour',now())::text)||':'||v_pref.user_id,p_payload)
    on conflict(idempotency_key) do nothing returning id into v_event;
    if v_event is not null then
      insert into public.wishlist_alert_deliveries(event_id,user_id,channel) values(v_event,v_pref.user_id,'in_app');
      perform public.publish_notification_event('wishlist_'||p_event_type,'product',p_product_id::text,p_payload||jsonb_build_object('user_id',v_pref.user_id,'wishlist_event_id',v_event));
      insert into public.customer_activity(customer_id,activity_type,description,metadata) select id,'wishlist_alert_triggered','Favori alarmı tetiklendi',jsonb_build_object('event_id',v_event,'product_id',p_product_id,'type',p_event_type) from public.customer_profiles where user_id=v_pref.user_id;
      v_count:=v_count+1;
    end if; v_event:=null;
  end loop; return v_count;
end $$;

create or replace function public.complete_wishlist_alert_delivery(p_delivery_id uuid,p_success boolean,p_error text default null)
returns boolean language plpgsql security definer set search_path=public,auth as $$
begin
  if not public.current_user_is_admin() then raise exception 'not_allowed'; end if;
  update public.wishlist_alert_deliveries set status=case when p_success then 'completed'::public.wishlist_alert_status else 'failed'::public.wishlist_alert_status end,attempt_count=attempt_count+1,last_error=case when p_success then null else left(p_error,500) end,delivered_at=case when p_success then now() else delivered_at end,updated_at=now() where id=p_delivery_id;
  return found;
end $$;
create or replace function public.retry_wishlist_alert_delivery(p_event_id uuid) returns boolean language plpgsql security definer set search_path=public,auth as $$
begin if not public.current_user_is_admin() then raise exception 'not_allowed'; end if; update public.wishlist_alert_deliveries set status='pending',last_error=null,updated_at=now() where event_id=p_event_id and status='failed'; perform public.write_audit_log('wishlist_alert_delivery_retried','system',p_event_id::text,'Wishlist alert',null,null,'{}'); return found; end $$;
create or replace function public.cancel_wishlist_alert_event(p_event_id uuid) returns boolean language plpgsql security definer set search_path=public,auth as $$
begin if not public.current_user_is_admin() then raise exception 'not_allowed'; end if; update public.wishlist_alert_events set status='cancelled',cancelled_at=now() where id=p_event_id and status in ('pending','failed'); update public.wishlist_alert_deliveries set status='cancelled',updated_at=now() where event_id=p_event_id and status in ('pending','failed'); perform public.write_audit_log('wishlist_alert_cancelled','system',p_event_id::text,'Wishlist alert',null,null,'{}'); return found; end $$;

create or replace function public.capture_product_price_stock_history() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if old.price is distinct from new.price then
  insert into public.product_price_history(product_id,old_price,new_price,change_percentage) values(new.id,old.price,new.price,round(((new.price-old.price)/nullif(old.price,0))*100,2));
  if new.price<old.price then perform public.create_wishlist_alert_event(new.id,'price_drop',jsonb_build_object('old_price',old.price,'new_price',new.price),'price:'||new.id||':'||new.price); end if;
 end if;
 if old.stock_quantity is distinct from new.stock_quantity then
  insert into public.product_stock_history(product_id,old_stock,new_stock,old_status,new_status) values(new.id,old.stock_quantity,new.stock_quantity,case when old.stock_quantity>0 then 'in_stock' else 'out_of_stock' end,case when new.stock_quantity>0 then 'in_stock' else 'out_of_stock' end);
  if old.stock_quantity<=0 and new.stock_quantity>0 then perform public.create_wishlist_alert_event(new.id,'back_in_stock',jsonb_build_object('stock',new.stock_quantity),'stock:'||new.id||':'||new.stock_quantity); end if;
 end if; return new;
end $$;
create trigger products_wishlist_history after update of price,stock_quantity on public.products for each row execute function public.capture_product_price_stock_history();

create or replace function public.capture_inventory_stock_history() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if old.quantity is distinct from new.quantity then
  insert into public.product_stock_history(product_id,old_stock,new_stock,old_status,new_status,warehouse_id) values(new.product_id,old.quantity,new.quantity,case when old.quantity>0 then 'in_stock' else 'out_of_stock' end,case when new.quantity>0 then 'in_stock' else 'out_of_stock' end,new.warehouse_id);
  if old.quantity<=0 and new.quantity>0 then perform public.create_wishlist_alert_event(new.product_id,'back_in_stock',jsonb_build_object('stock',new.quantity,'warehouse_id',new.warehouse_id),'inventory:'||new.product_id||':'||new.warehouse_id||':'||new.quantity); end if;
 end if; return new;
end $$;
create trigger inventory_wishlist_history after update of quantity on public.inventory for each row execute function public.capture_inventory_stock_history();

create or replace function public.capture_campaign_wishlist_alerts() returns trigger language plpgsql security definer set search_path=public as $$
declare v_product uuid;
begin
 if new.is_active and new.starts_at<=now() and new.ends_at>=now() and (tg_op='INSERT' or old.is_active is distinct from new.is_active or old.starts_at is distinct from new.starts_at) then
  for v_product in select p.id from public.products p where p.is_active and (new.product_id is null or p.id=new.product_id) and (new.category_id is null or p.category_id=new.category_id) and (new.brand_id is null or p.brand_id=new.brand_id) loop
   perform public.create_wishlist_alert_event(v_product,'promotion_started',jsonb_build_object('campaign_id',new.id,'campaign_name',new.name),'campaign:'||new.id||':'||v_product);
  end loop;
 end if; return new;
end $$;
create trigger campaigns_wishlist_alert after insert or update of is_active,starts_at,ends_at on public.campaigns for each row execute function public.capture_campaign_wishlist_alerts();

create or replace function public.get_admin_wishlist_alerts(p_query text default '',p_type text default null,p_status text default null,p_page integer default 1,p_page_size integer default 20)
returns jsonb language sql security definer set search_path=public,auth stable as $$
 select case when public.current_user_is_admin() then jsonb_build_object(
  'rows',coalesce((select jsonb_agg(to_jsonb(x)) from (select e.id,e.event_type,e.status,e.product_id,e.user_id,p.name product_name,u.email user_email,e.created_at,d.status delivery_status from public.wishlist_alert_events e join public.products p on p.id=e.product_id left join auth.users u on u.id=e.user_id left join public.wishlist_alert_deliveries d on d.event_id=e.id where (p_type is null or e.event_type::text=p_type) and (p_status is null or coalesce(d.status,e.status)::text=p_status) and (p_query='' or p.name ilike '%'||p_query||'%' or coalesce(u.email,'') ilike '%'||p_query||'%') order by e.created_at desc limit greatest(1,least(p_page_size,100)) offset (greatest(p_page,1)-1)*greatest(1,least(p_page_size,100))) x),'[]'::jsonb),
  'total',(select count(*) from public.wishlist_alert_events),
  'metrics',jsonb_build_object('totalPreferences',(select count(*) from public.wishlist_alert_preferences),'priceAlerts',(select count(*) from public.wishlist_alert_preferences where price_drop),'stockAlerts',(select count(*) from public.wishlist_alert_preferences where back_in_stock),'promotionAlerts',(select count(*) from public.wishlist_alert_preferences where promotion_started),'events',(select count(*) from public.wishlist_alert_events),'pending',(select count(*) from public.wishlist_alert_deliveries where status='pending'),'completed',(select count(*) from public.wishlist_alert_deliveries where status='completed'),'failed',(select count(*) from public.wishlist_alert_deliveries where status='failed'))
 ) else null end
$$;

revoke all on function public.set_wishlist_alert_preference(uuid,boolean,boolean,boolean) from public; grant execute on function public.set_wishlist_alert_preference(uuid,boolean,boolean,boolean) to authenticated;
revoke all on function public.create_wishlist_alert_event(uuid,text,jsonb,text) from public; grant execute on function public.create_wishlist_alert_event(uuid,text,jsonb,text) to authenticated;
revoke all on function public.complete_wishlist_alert_delivery(uuid,boolean,text),public.retry_wishlist_alert_delivery(uuid),public.cancel_wishlist_alert_event(uuid),public.get_admin_wishlist_alerts(text,text,text,integer,integer) from public;
grant execute on function public.complete_wishlist_alert_delivery(uuid,boolean,text),public.retry_wishlist_alert_delivery(uuid),public.cancel_wishlist_alert_event(uuid),public.get_admin_wishlist_alerts(text,text,text,integer,integer) to authenticated;

-- ============================================================================
-- SOURCE: supabase/migrations/202607250015_manual_payment_approval.sql
-- ============================================================================
-- Manual payment approval flow. Apply manually after review.
alter table public.payment_transactions drop constraint if exists payment_transactions_status_check;
alter table public.payment_transactions add constraint payment_transactions_status_check check(status in ('pending','awaiting_payment','awaiting_phone_approval','customer_unreachable','paid','failed','cancelled','refunded'));

alter function public.create_order(jsonb) rename to create_order_without_manual_approval;
create or replace function public.create_order(p_payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_method text:=p_payload->>'payment_method'; v_payload jsonb:=p_payload; v_result jsonb; v_order uuid; v_user uuid;
begin
  if v_method not in ('transfer','phone_approval') then raise exception 'invalid_payment_method'; end if;
  -- Existing order pipeline only knows legacy methods. This internal value is replaced atomically and never exposed.
  if v_method='phone_approval' then v_payload:=jsonb_set(v_payload,'{payment_method}','"cash"'::jsonb); end if;
  v_result:=public.create_order_without_manual_approval(v_payload);
  v_order:=(v_result->>'id')::uuid;
  select user_id into v_user from public.orders where id=v_order;
  if v_method='phone_approval' then
    update public.orders set payment_method='phone_approval',payment_status='awaiting_phone_approval',payment_note='Telefon ile ödeme onayı bekleniyor.',payment_account_snapshot=null,
      status_history=coalesce(status_history,'[]'::jsonb)||jsonb_build_array(jsonb_build_object('status','payment:awaiting_phone_approval','label','Telefon ile onay bekleniyor','at',timezone('utc',now()))) where id=v_order;
    update public.payment_transactions set provider='manual_phone_approval',status='awaiting_phone_approval',payment_account_id=null,note='Telefon ile ödeme onayı bekleniyor.',metadata=metadata||jsonb_build_object('payment_method','phone_approval') where order_id=v_order and transaction_type='payment';
    perform public.publish_notification_event('payment_phone_requested','order',v_order::text,jsonb_build_object('user_id',v_user,'order_number',v_result->>'order_number'));
    insert into public.customer_activity(customer_id,activity_type,description,metadata) select id,'payment_requested','Telefon ile ödeme onayı talep edildi',jsonb_build_object('order_id',v_order) from public.customer_profiles where user_id=v_user;
  end if;
  insert into public.analytics_events(event_name,entity_type,entity_id,user_id,payload) values('payment_method_selected','order',v_order::text,v_user,jsonb_build_object('method',v_method));
  return v_result;
end $$;

create or replace function public.admin_update_manual_payment(p_order_id uuid,p_action text,p_note text default '')
returns boolean language plpgsql security definer set search_path='' as $$
declare v_order public.orders%rowtype; v_new_status text; v_order_status text; v_notification text; v_crm text; v_analytics text;
begin
  if not public.current_user_is_admin() then raise exception 'forbidden'; end if;
  if p_action not in ('paid','rejected','unreachable','waiting') then raise exception 'invalid_action'; end if;
  select * into v_order from public.orders where id=p_order_id for update;
  if not found then return false; end if;
  v_new_status:=case p_action when 'paid' then 'paid' when 'rejected' then 'failed' when 'unreachable' then 'customer_unreachable' else case when v_order.payment_method='phone_approval' then 'awaiting_phone_approval' else 'awaiting_payment' end end;
  v_order_status:=case when p_action='paid' then 'preparing' else v_order.status end;
  v_notification:=case when p_action='paid' then 'payment_completed' when p_action='rejected' then 'payment_rejected' else null end;
  v_crm:=case when p_action='paid' then 'payment_completed' when p_action='rejected' then 'payment_failed' else 'payment_requested' end;
  v_analytics:=case when p_action='paid' then 'payment_completed' when p_action='rejected' then 'payment_failed' else null end;
  update public.orders set status=v_order_status,payment_status=v_new_status,admin_note=coalesce(nullif(trim(p_note),''),admin_note),
    status_history=coalesce(status_history,'[]'::jsonb)||jsonb_build_array(jsonb_build_object('status','payment:'||v_new_status,'label',case p_action when 'paid' then 'Ödeme alındı' when 'rejected' then 'Ödeme reddedildi' when 'unreachable' then 'Müşteriye ulaşılamadı' else 'Ödeme bekleniyor' end,'at',timezone('utc',now()),'admin_id',auth.uid())) where id=p_order_id;
  update public.payment_transactions set status=v_new_status,note=coalesce(nullif(trim(p_note),''),note),updated_at=now() where order_id=p_order_id and transaction_type='payment';
  if v_notification is not null then perform public.publish_notification_event(v_notification,'order',p_order_id::text,jsonb_build_object('user_id',v_order.user_id,'order_number',v_order.order_number)); end if;
  insert into public.customer_activity(customer_id,activity_type,description,metadata) select id,v_crm,v_crm,jsonb_build_object('order_id',p_order_id,'status',v_new_status) from public.customer_profiles where user_id=v_order.user_id;
  if v_analytics is not null then insert into public.analytics_events(event_name,entity_type,entity_id,user_id,payload) values(v_analytics,'order',p_order_id::text,v_order.user_id,jsonb_build_object('method',v_order.payment_method)); end if;
  perform public.write_audit_log(case when p_action='paid' then 'payment_approved' else 'payment_updated' end,'payment',p_order_id::text,v_order.order_number,jsonb_build_object('payment_status',v_order.payment_status,'order_status',v_order.status),jsonb_build_object('payment_status',v_new_status,'order_status',v_order_status),jsonb_build_object('action',p_action,'note',left(p_note,500)));
  return true;
end $$;

revoke all on function public.create_order(jsonb),public.admin_update_manual_payment(uuid,text,text) from public;
grant execute on function public.create_order(jsonb) to anon,authenticated;
grant execute on function public.admin_update_manual_payment(uuid,text,text) to authenticated;

-- ============================================================================
-- SOURCE: supabase/migrations/202607250016_production_dashboard_metrics.sql
-- ============================================================================
create or replace function public.admin_dashboard_metrics()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'core', jsonb_build_object(
      'products', (select count(*) from public.products),
      'customers', (select count(*) from public.customer_profiles),
      'orders', (select count(*) from public.orders),
      'netRevenue', (select coalesce(sum(grand_total), 0) from public.orders where payment_status = 'paid' and status <> 'cancelled')
    ),
    'inventory', jsonb_build_object(
      'total', (select coalesce(sum(quantity_on_hand), 0) from public.inventory),
      'reserved', (select coalesce(sum(quantity_reserved), 0) from public.inventory),
      'outOfStock', (select count(distinct product_id) from public.inventory where quantity_on_hand - quantity_reserved = 0),
      'critical', (select count(distinct product_id) from public.inventory where quantity_on_hand - quantity_reserved > 0 and quantity_on_hand - quantity_reserved <= reorder_level)
    ),
    'crm', jsonb_build_object(
      'total', (select count(*) from public.customer_profiles),
      'active', (select count(*) from public.customer_profiles where status = 'active'),
      'vip', (select count(*) from public.customer_profiles where segment = 'vip'),
      'newCustomers', (select count(*) from public.customer_profiles where created_at >= timezone('utc', now()) - interval '30 days'),
      'blocked', (select count(*) from public.customer_profiles where status = 'blocked')
    ),
    'shipping', jsonb_build_object(
      'ready', (select count(*) from public.shipments where status = 'ready_for_shipment'),
      'shipped', (select count(*) from public.shipments where status = 'shipped'),
      'transit', (select count(*) from public.shipments where status in ('in_transit', 'out_for_delivery')),
      'deliveredToday', (select count(*) from public.shipments where delivered_at >= date_trunc('day', timezone('utc', now())) and delivered_at < date_trunc('day', timezone('utc', now())) + interval '1 day'),
      'failed', (select count(*) from public.shipments where status = 'delivery_failed')
    ),
    'analytics', jsonb_build_object(
      'todayRevenue', (select coalesce(sum(grand_total), 0) from public.orders where payment_status = 'paid' and status <> 'cancelled' and created_at >= date_trunc('day', timezone('utc', now()))),
      'weekRevenue', (select coalesce(sum(grand_total), 0) from public.orders where payment_status = 'paid' and status <> 'cancelled' and created_at >= timezone('utc', now()) - interval '7 days'),
      'todayOrders', (select count(*) from public.orders where created_at >= date_trunc('day', timezone('utc', now()))),
      'averageOrder', (select coalesce(avg(grand_total), 0) from public.orders where payment_status = 'paid' and status <> 'cancelled' and created_at >= timezone('utc', now()) - interval '7 days'),
      'newCustomersToday', (select count(*) from public.customer_profiles where created_at >= date_trunc('day', timezone('utc', now())))
    )
  );
end;
$$;

revoke all on function public.admin_dashboard_metrics() from public, anon;
grant execute on function public.admin_dashboard_metrics() to authenticated;

-- ============================================================================
-- SOURCE: supabase/migrations/202607250017_reload_postgrest_schema.sql
-- ============================================================================
notify pgrst, 'reload schema';

commit;
