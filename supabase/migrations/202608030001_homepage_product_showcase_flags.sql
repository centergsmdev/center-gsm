alter table public.products
  add column if not exists is_weekly_deal boolean not null default false,
  add column if not exists is_latest_phone boolean not null default false;

update public.products
set is_weekly_deal = true
where id in (
  select id
  from public.products
  where is_active = true
    and old_price is not null
    and old_price > price
  order by review_count desc, rating desc, created_at desc
  limit 8
);

update public.products
set is_latest_phone = true
where id in (
  select product.id
  from public.products product
  join public.categories category on category.id = product.category_id
  where product.is_active = true
    and category.slug = 'telefon'
  order by product.created_at desc
  limit 8
);

create index if not exists products_active_weekly_deal_idx
  on public.products(is_active, is_weekly_deal);

create index if not exists products_active_latest_phone_idx
  on public.products(is_active, is_latest_phone);

notify pgrst, 'reload schema';
