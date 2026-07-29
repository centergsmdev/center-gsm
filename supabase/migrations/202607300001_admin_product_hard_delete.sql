begin;

create or replace function public.admin_delete_product(p_product_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_product public.products%rowtype;
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

  delete from public.campaigns where product_id = p_product_id;
  delete from public.inventory_reservations where product_id = p_product_id;
  delete from public.inventory_movements where product_id = p_product_id;
  delete from public.inventory where product_id = p_product_id;
  delete from public.products where id = p_product_id;

  return jsonb_build_object(
    'deleted', true,
    'product_id', p_product_id,
    'slug', v_product.slug
  );
end;
$$;

revoke all on function public.admin_delete_product(uuid) from public;
grant execute on function public.admin_delete_product(uuid) to authenticated;

commit;
