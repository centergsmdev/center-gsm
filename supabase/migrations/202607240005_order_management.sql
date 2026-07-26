begin;

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

commit;
