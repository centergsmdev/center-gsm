begin;

alter table public.products
  add column if not exists technical_specifications text,
  add column if not exists box_contents text,
  add column if not exists delivery_returns text;

commit;
