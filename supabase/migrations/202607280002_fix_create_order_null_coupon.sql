begin;

create or replace function public.create_order_without_loyalty(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id uuid;
  v_order_number text;
  v_item jsonb;
  v_pricing jsonb;
  v_shipping numeric(12,2);
  v_total numeric(12,2);
  v_tax numeric(12,2);
  v_delivery text := p_payload->>'delivery_method';
  v_payment text := p_payload->>'payment_method';
  v_carrier public.shipping_carriers%rowtype;
begin
  if coalesce(p_payload->'delivery_address'->>'email','') = ''
    or coalesce(p_payload->'delivery_address'->>'phone','') = '' then
    raise exception 'invalid_contact';
  end if;

  if v_delivery not in ('standard','express','store')
    or v_payment not in ('card','transfer','cash') then
    raise exception 'invalid_method';
  end if;

  select *
  into v_carrier
  from public.shipping_carriers
  where provider_key = p_payload->>'selected_shipping_provider'
    and is_active;

  if not found
    or v_carrier.provider_key not in ('yurtici','mng','aras','surat','ptt','hepsijet') then
    raise exception 'invalid_shipping_provider';
  end if;

  v_pricing := public.compute_order_pricing(
    p_payload->'items',
    p_payload->>'coupon_code',
    true
  );

  loop
    v_order_number := 'CG-'
      || extract(year from timezone('utc',now()))::text
      || '-'
      || lpad(floor(random()*100000000)::bigint::text,8,'0');
    exit when not exists(
      select 1 from public.orders where order_number = v_order_number
    );
  end loop;

  v_shipping := case
    when v_delivery = 'express' then 199
    when (v_pricing->>'payable_subtotal')::numeric < 2500
      and v_delivery = 'standard' then 149
    else 0
  end;
  v_total := greatest(
    0,
    (v_pricing->>'payable_subtotal')::numeric + v_shipping
  );
  v_tax := round(v_total - (v_total / 1.20), 2);

  insert into public.orders(
    order_number,
    user_id,
    status,
    payment_method,
    payment_status,
    delivery_method,
    subtotal,
    discount_total,
    shipping_total,
    tax_total,
    grand_total,
    delivery_address,
    billing_address,
    status_history,
    coupon_snapshot,
    campaign_snapshots,
    selected_shipping_provider,
    selected_shipping_name,
    estimated_delivery_days,
    shipping_note,
    shipping_method_snapshot
  )
  values(
    v_order_number,
    auth.uid(),
    'received',
    v_payment,
    'pending',
    v_delivery,
    (v_pricing->>'subtotal')::numeric,
    (v_pricing->>'discount_total')::numeric,
    v_shipping,
    v_tax,
    v_total,
    p_payload->'delivery_address',
    p_payload->'billing_address',
    jsonb_build_array(
      jsonb_build_object(
        'status','received',
        'label','Sipariş alındı',
        'at',timezone('utc',now())
      )
    ),
    v_pricing->'coupon',
    v_pricing->'campaigns',
    v_carrier.provider_key,
    v_carrier.name,
    v_carrier.estimated_delivery_days,
    nullif(trim(p_payload->>'shipping_note'),''),
    jsonb_build_object(
      'code',v_delivery,
      'carrier_id',v_carrier.id,
      'provider',v_carrier.provider_key,
      'name',v_carrier.name,
      'estimated_delivery_days',v_carrier.estimated_delivery_days,
      'note',nullif(trim(p_payload->>'shipping_note'),'')
    )
  )
  returning id into v_order_id;

  for v_item in
    select value from jsonb_array_elements(v_pricing->'items')
  loop
    insert into public.order_items(
      order_id,
      product_id,
      product_name,
      sku,
      quantity,
      unit_price,
      discount_total,
      line_total,
      product_snapshot
    )
    values(
      v_order_id,
      (v_item->>'product_id')::uuid,
      v_item->>'name',
      v_item->>'sku',
      (v_item->>'quantity')::integer,
      (v_item->>'unit_price')::numeric,
      0,
      (v_item->>'line_subtotal')::numeric,
      jsonb_build_object(
        'slug',v_item->>'slug',
        'image_url',v_item->>'image_url'
      )
    );
  end loop;

  if jsonb_typeof(v_pricing->'coupon') = 'object' then
    insert into public.coupon_usages(coupon_id,user_id,order_id)
    values(
      (v_pricing->'coupon'->>'id')::uuid,
      auth.uid(),
      v_order_id
    );
  end if;

  return jsonb_build_object(
    'id',v_order_id,
    'order_number',v_order_number,
    'grand_total',v_total,
    'subtotal',(v_pricing->>'subtotal')::numeric,
    'discount_total',(v_pricing->>'discount_total')::numeric,
    'campaign_discount',(v_pricing->>'campaign_discount')::numeric,
    'coupon_discount',(v_pricing->>'coupon_discount')::numeric,
    'created_at',timezone('utc',now())
  );
end;
$$;

revoke all on function public.create_order_without_loyalty(jsonb) from public;
grant execute on function public.create_order_without_loyalty(jsonb)
  to anon, authenticated;

notify pgrst, 'reload schema';

commit;
