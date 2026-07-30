begin;

create table if not exists public.product_colors (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on update cascade on delete cascade,
  name text not null check (length(trim(name)) > 0),
  display_name text,
  hex_code text not null check (hex_code ~ '^#[0-9A-Fa-f]{6}$'),
  is_active boolean not null default true,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (product_id, name)
);

alter table public.product_variants
  add column if not exists color_id uuid references public.product_colors(id) on update cascade on delete restrict,
  add column if not exists storage_value integer,
  add column if not exists storage_unit text,
  add column if not exists barcode text,
  add column if not exists sort_order integer not null default 0,
  add column if not exists is_default boolean not null default false;

alter table public.product_images
  add column if not exists color_id uuid references public.product_colors(id) on update cascade on delete restrict;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'product_variants_storage_value_check' and conrelid = 'public.product_variants'::regclass) then
    alter table public.product_variants add constraint product_variants_storage_value_check check (storage_value is null or storage_value > 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'product_variants_storage_unit_check' and conrelid = 'public.product_variants'::regclass) then
    alter table public.product_variants add constraint product_variants_storage_unit_check check (storage_unit is null or storage_unit in ('GB', 'TB'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'product_variants_storage_pair_check' and conrelid = 'public.product_variants'::regclass) then
    alter table public.product_variants add constraint product_variants_storage_pair_check check ((storage_value is null) = (storage_unit is null));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'product_variants_sort_order_check' and conrelid = 'public.product_variants'::regclass) then
    alter table public.product_variants add constraint product_variants_sort_order_check check (sort_order >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'product_variants_default_active_check' and conrelid = 'public.product_variants'::regclass) then
    alter table public.product_variants add constraint product_variants_default_active_check check (not is_default or is_active);
  end if;
end;
$$;

alter table public.product_images drop constraint if exists product_images_product_id_sort_order_key;
drop index if exists public.product_images_one_primary_per_product_idx;

create unique index if not exists product_variants_combination_unique_idx
  on public.product_variants (
    product_id,
    coalesce(color_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(storage_value, -1),
    coalesce(storage_unit, '')
  ) where color_id is not null or storage_value is not null;
create unique index if not exists product_variants_barcode_unique_idx
  on public.product_variants (barcode) where barcode is not null and length(trim(barcode)) > 0;
create unique index if not exists product_variants_one_default_idx
  on public.product_variants (product_id) where is_default;
create index if not exists product_variants_product_sort_idx
  on public.product_variants (product_id, sort_order);
create index if not exists product_variants_color_idx
  on public.product_variants (color_id) where color_id is not null;
create index if not exists product_colors_product_sort_idx
  on public.product_colors (product_id, sort_order);
create unique index if not exists product_colors_name_ci_unique_idx
  on public.product_colors (product_id, lower(trim(name)));
create unique index if not exists product_images_product_color_sort_idx
  on public.product_images (
    product_id,
    coalesce(color_id, '00000000-0000-0000-0000-000000000000'::uuid),
    sort_order
  );
create unique index if not exists product_images_one_product_primary_idx
  on public.product_images (product_id) where is_primary and color_id is null;
create unique index if not exists product_images_one_color_primary_idx
  on public.product_images (product_id, color_id) where is_primary and color_id is not null;
create index if not exists product_images_color_idx
  on public.product_images (color_id) where color_id is not null;

drop trigger if exists set_product_colors_updated_at on public.product_colors;
create trigger set_product_colors_updated_at
before update on public.product_colors
for each row execute function public.set_updated_at();

alter table public.product_colors enable row level security;

drop policy if exists "Public can read active product colors" on public.product_colors;
create policy "Public can read active product colors"
on public.product_colors for select to anon, authenticated
using (
  is_active and exists (
    select 1 from public.products
    where products.id = product_colors.product_id and products.is_active
  )
);

drop policy if exists "Admins can read all product colors" on public.product_colors;
create policy "Admins can read all product colors"
on public.product_colors for select to authenticated
using ((select public.is_admin()));

drop policy if exists "Admins can manage product colors" on public.product_colors;
create policy "Admins can manage product colors"
on public.product_colors for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists "Admins can read all product variants" on public.product_variants;
create policy "Admins can read all product variants"
on public.product_variants for select to authenticated
using ((select public.is_admin()));

drop policy if exists "Admins can manage product variants" on public.product_variants;
create policy "Admins can manage product variants"
on public.product_variants for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

grant select on public.product_colors to anon, authenticated;
grant insert, update, delete on public.product_colors to authenticated;
grant insert, update, delete on public.product_variants to authenticated;

create or replace function public.admin_save_product_variant_setup(
  p_product_id uuid,
  p_colors jsonb,
  p_variants jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  color_item jsonb;
  variant_item jsonb;
  source_id text;
  resolved_color_id uuid;
  resolved_variant_id uuid;
  retained_color_ids uuid[] := array[]::uuid[];
  retained_variant_ids uuid[] := array[]::uuid[];
  color_map jsonb := '{}'::jsonb;
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'admin_required';
  end if;
  if not exists (select 1 from public.products where id = p_product_id) then
    raise exception using errcode = 'P0002', message = 'product_not_found';
  end if;

  for color_item in select value from jsonb_array_elements(coalesce(p_colors, '[]'::jsonb))
  loop
    source_id := color_item ->> 'id';
    if source_id like 'new-%' then
      insert into public.product_colors (product_id, name, display_name, hex_code, is_active, sort_order)
      values (
        p_product_id,
        trim(color_item ->> 'name'),
        nullif(trim(color_item ->> 'display_name'), ''),
        upper(color_item ->> 'hex_code'),
        coalesce((color_item ->> 'is_active')::boolean, true),
        coalesce((color_item ->> 'sort_order')::integer, 0)
      ) returning id into resolved_color_id;
    else
      resolved_color_id := source_id::uuid;
      update public.product_colors set
        name = trim(color_item ->> 'name'),
        display_name = nullif(trim(color_item ->> 'display_name'), ''),
        hex_code = upper(color_item ->> 'hex_code'),
        is_active = coalesce((color_item ->> 'is_active')::boolean, true),
        sort_order = coalesce((color_item ->> 'sort_order')::integer, 0)
      where id = resolved_color_id and product_id = p_product_id;
      if not found then raise exception using errcode = 'P0002', message = 'color_not_found'; end if;
    end if;
    retained_color_ids := array_append(retained_color_ids, resolved_color_id);
    color_map := jsonb_set(color_map, array[source_id], to_jsonb(resolved_color_id::text));
  end loop;

  update public.product_variants set is_default = false where product_id = p_product_id;

  for variant_item in select value from jsonb_array_elements(coalesce(p_variants, '[]'::jsonb))
  loop
    source_id := variant_item ->> 'color_id';
    resolved_color_id := null;
    if nullif(source_id, '') is not null then
      resolved_color_id := coalesce(color_map ->> source_id, source_id)::uuid;
    end if;
    source_id := variant_item ->> 'id';
    if source_id like 'new-%' then
      insert into public.product_variants (
        product_id, color_id, storage_value, storage_unit, name, sku, barcode,
        attributes, price, old_price, stock_quantity, is_active, is_default, sort_order
      ) values (
        p_product_id,
        resolved_color_id,
        nullif(variant_item ->> 'storage_value', '')::integer,
        nullif(variant_item ->> 'storage_unit', ''),
        coalesce(variant_item ->> 'name', 'Varyant'),
        trim(variant_item ->> 'sku'),
        nullif(trim(variant_item ->> 'barcode'), ''),
        coalesce(variant_item -> 'attributes', '{}'::jsonb),
        (variant_item ->> 'price')::numeric,
        nullif(variant_item ->> 'old_price', '')::numeric,
        (variant_item ->> 'stock_quantity')::integer,
        coalesce((variant_item ->> 'is_active')::boolean, true),
        coalesce((variant_item ->> 'is_default')::boolean, false),
        coalesce((variant_item ->> 'sort_order')::integer, 0)
      ) returning id into resolved_variant_id;
    else
      resolved_variant_id := source_id::uuid;
      update public.product_variants set
        color_id = resolved_color_id,
        storage_value = nullif(variant_item ->> 'storage_value', '')::integer,
        storage_unit = nullif(variant_item ->> 'storage_unit', ''),
        name = coalesce(variant_item ->> 'name', name),
        sku = trim(variant_item ->> 'sku'),
        barcode = nullif(trim(variant_item ->> 'barcode'), ''),
        attributes = coalesce(variant_item -> 'attributes', '{}'::jsonb),
        price = (variant_item ->> 'price')::numeric,
        old_price = nullif(variant_item ->> 'old_price', '')::numeric,
        stock_quantity = (variant_item ->> 'stock_quantity')::integer,
        is_active = coalesce((variant_item ->> 'is_active')::boolean, true),
        is_default = coalesce((variant_item ->> 'is_default')::boolean, false),
        sort_order = coalesce((variant_item ->> 'sort_order')::integer, 0)
      where id = resolved_variant_id and product_id = p_product_id;
      if not found then raise exception using errcode = 'P0002', message = 'variant_not_found'; end if;
    end if;
    retained_variant_ids := array_append(retained_variant_ids, resolved_variant_id);
  end loop;

  delete from public.product_variants
  where product_id = p_product_id and not (id = any(retained_variant_ids));

  if exists (
    select 1 from public.product_images
    where product_id = p_product_id
      and color_id is not null
      and not (color_id = any(retained_color_ids))
  ) then
    raise exception using errcode = '23503', message = 'color_has_images';
  end if;

  delete from public.product_colors
  where product_id = p_product_id and not (id = any(retained_color_ids));

  return jsonb_build_object('saved', true);
end;
$$;

revoke all on function public.admin_save_product_variant_setup(uuid, jsonb, jsonb) from public;
grant execute on function public.admin_save_product_variant_setup(uuid, jsonb, jsonb) to authenticated;

commit;
