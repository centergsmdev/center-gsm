begin;

create extension if not exists pg_trgm with schema extensions;

create or replace function public.normalize_search_text(value text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select lower(
    translate(
      coalesce(value, ''),
      'ÇĞİIÖŞÜçğıöşü',
      'CGIIOSUcgiosu'
    )
  );
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'products'
      and column_name = 'short_description'
  ) then
    execute $sql$
      update public.products
      set description = short_description
      where nullif(btrim(description), '') is null
        and nullif(btrim(short_description), '') is not null
    $sql$;
  end if;
end;
$$;

drop index if exists public.products_search_text_trgm_idx;

alter table public.products
  drop column if exists search_text;

alter table public.products
  drop column if exists short_description,
  drop column if exists technical_specifications,
  drop column if exists box_contents,
  drop column if exists delivery_returns;

alter table public.products
  add column search_text text
  generated always as (
    public.normalize_search_text(
      name || ' ' || coalesce(description, '') || ' ' || sku
    )
  ) stored;

create index products_search_text_trgm_idx
  on public.products using gin (search_text extensions.gin_trgm_ops)
  where is_active = true;

create or replace function public.admin_delete_product(p_product_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_product public.products%rowtype;
  v_dependency record;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select *
  into v_product
  from public.products
  where id = p_product_id
  for update;

  if not found then
    return jsonb_build_object('deleted', false, 'reason', 'not_found');
  end if;

  if exists (
    select 1
    from public.order_items
    where product_id = p_product_id
  ) then
    return jsonb_build_object('deleted', false, 'reason', 'order_history');
  end if;

  for v_dependency in
    select
      constraint_table.oid::regclass as table_name,
      constraint_column.attname as column_name
    from pg_catalog.pg_constraint constraint_definition
    join pg_catalog.pg_class constraint_table
      on constraint_table.oid = constraint_definition.conrelid
    join pg_catalog.pg_namespace constraint_schema
      on constraint_schema.oid = constraint_table.relnamespace
    join pg_catalog.pg_attribute constraint_column
      on constraint_column.attrelid = constraint_definition.conrelid
     and constraint_column.attnum = constraint_definition.conkey[1]
    where constraint_definition.contype = 'f'
      and constraint_definition.confrelid = 'public.products'::regclass
      and cardinality(constraint_definition.conkey) = 1
      and constraint_schema.nspname = 'public'
      and constraint_table.relname <> 'order_items'
  loop
    execute format(
      'delete from %s where %I = $1',
      v_dependency.table_name,
      v_dependency.column_name
    ) using p_product_id;
  end loop;

  delete from public.products where id = p_product_id;

  return jsonb_build_object(
    'deleted', true,
    'product_id', p_product_id,
    'slug', v_product.slug
  );
exception
  when foreign_key_violation then
    raise exception 'product_dependency_conflict: %', sqlerrm
      using errcode = '23503';
end;
$$;

revoke all on function public.admin_delete_product(uuid) from public;
grant execute on function public.admin_delete_product(uuid) to authenticated;

notify pgrst, 'reload schema';

commit;
