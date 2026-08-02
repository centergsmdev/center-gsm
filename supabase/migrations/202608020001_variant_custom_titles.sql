begin;

create or replace function public.apply_order_item_variant_title()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  variant_title text;
begin
  if new.variant_id is not null then
    select nullif(trim(variant.attributes ->> 'variantTitle'), '')
    into variant_title
    from public.product_variants variant
    where variant.id = new.variant_id;

    new.product_name := coalesce(variant_title, new.product_name);
  end if;

  return new;
end;
$$;

revoke all on function public.apply_order_item_variant_title() from public;

drop trigger if exists apply_order_item_variant_title on public.order_items;
create trigger apply_order_item_variant_title
before insert on public.order_items
for each row execute function public.apply_order_item_variant_title();

commit;
