begin;

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

commit;
