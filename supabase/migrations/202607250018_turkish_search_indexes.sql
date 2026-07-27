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

alter table public.brands
  add column if not exists search_name text
  generated always as (public.normalize_search_text(name)) stored;

alter table public.categories
  add column if not exists search_name text
  generated always as (public.normalize_search_text(name)) stored;

alter table public.products
  add column if not exists search_text text
  generated always as (
    public.normalize_search_text(
      name || ' ' || coalesce(description, '') || ' ' ||
      coalesce(short_description, '') || ' ' || sku
    )
  ) stored;

create index if not exists brands_search_name_trgm_idx
  on public.brands using gin (search_name extensions.gin_trgm_ops)
  where is_active = true;

create index if not exists categories_search_name_trgm_idx
  on public.categories using gin (search_name extensions.gin_trgm_ops)
  where is_active = true;

create index if not exists products_search_text_trgm_idx
  on public.products using gin (search_text extensions.gin_trgm_ops)
  where is_active = true;

notify pgrst, 'reload schema';

commit;
