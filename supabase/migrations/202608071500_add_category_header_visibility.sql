alter table public.categories
add column if not exists show_in_header boolean not null default false;

with initial_header_categories as (
  select id
  from public.categories
  where is_active = true
  order by sort_order asc, created_at asc, name asc
  limit 7
)
update public.categories
set show_in_header = true
where id in (select id from initial_header_categories)
  and not exists (
    select 1
    from public.categories
    where show_in_header = true
  );

create index if not exists categories_header_navigation_idx
on public.categories (show_in_header, sort_order, created_at)
where is_active = true;
