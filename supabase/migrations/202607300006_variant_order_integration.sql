begin;

create or replace function public.compute_order_pricing(
  p_items jsonb,
  p_coupon_code text,
  p_lock_coupon boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item jsonb;
  v_product public.products%rowtype;
  v_variant public.product_variants%rowtype;
  v_color public.product_colors%rowtype;
  v_campaign public.campaigns%rowtype;
  v_coupon public.coupons%rowtype;
  v_quantity integer;
  v_unit_price numeric(12,2);
  v_line numeric(12,2);
  v_line_discount numeric(12,2);
  v_subtotal numeric(12,2) := 0;
  v_campaign_discount numeric(12,2) := 0;
  v_coupon_discount numeric(12,2) := 0;
  v_remaining numeric(12,2);
  v_lines jsonb := '[]'::jsonb;
  v_campaigns jsonb := '[]'::jsonb;
  v_code text := upper(trim(coalesce(p_coupon_code, '')));
  v_total_usage integer;
  v_user_usage integer;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'invalid_items';
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_quantity := (v_item->>'quantity')::integer;
    if v_quantity < 1 or v_quantity > 10 then
      raise exception 'invalid_quantity';
    end if;

    v_product := null;
    v_variant := null;
    v_color := null;

    if nullif(v_item->>'variant_id', '') is not null then
      select pv.*
      into v_variant
      from public.product_variants pv
      join public.products p on p.id = pv.product_id
      where pv.id = (v_item->>'variant_id')::uuid
        and pv.is_active
        and p.is_active
      limit 1;

      if not found or v_variant.stock_quantity < v_quantity then
        raise exception 'insufficient_variant_inventory';
      end if;

      select * into strict v_product
      from public.products
      where id = v_variant.product_id;

      if v_variant.color_id is not null then
        select * into v_color
        from public.product_colors
        where id = v_variant.color_id and is_active;
      end if;

      v_unit_price := v_variant.price;
    else
      select * into v_product
      from public.products
      where sku = v_item->>'sku' and is_active
      limit 1;

      if not found or v_product.stock_quantity < v_quantity then
        raise exception 'product_unavailable';
      end if;

      v_unit_price := v_product.price;
    end if;

    v_line := round(v_unit_price * v_quantity, 2);
    v_subtotal := v_subtotal + v_line;
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'product_id', v_product.id,
      'variant_id', v_variant.id,
      'name', v_product.name,
      'slug', v_product.slug,
      'sku', coalesce(v_variant.sku, v_product.sku),
      'barcode', v_variant.barcode,
      'color_name', coalesce(v_color.display_name, v_color.name),
      'color_hex', v_color.hex_code,
      'storage_value', v_variant.storage_value,
      'storage_unit', v_variant.storage_unit,
      'quantity', v_quantity,
      'unit_price', v_unit_price,
      'line_subtotal', v_line,
      'image_url', v_item->>'image_url'
    ));
  end loop;

  for v_item in select value from jsonb_array_elements(v_lines)
  loop
    select * into v_product
    from public.products
    where id = (v_item->>'product_id')::uuid;

    select c.* into v_campaign
    from public.campaigns c
    where c.is_active
      and c.starts_at <= timezone('utc', now())
      and c.ends_at >= timezone('utc', now())
      and c.minimum_order_amount <= v_subtotal
      and (c.product_id is null or c.product_id = v_product.id)
      and (c.category_id is null or c.category_id = v_product.category_id)
      and (c.brand_id is null or c.brand_id = v_product.brand_id)
    order by least(
      (v_item->>'line_subtotal')::numeric,
      case
        when c.discount_type = 'percentage'
          then (v_item->>'line_subtotal')::numeric * c.discount_value / 100
        else c.discount_value
      end,
      coalesce(c.maximum_discount_amount, (v_item->>'line_subtotal')::numeric)
    ) desc, c.created_at
    limit 1;

    if found then
      v_line_discount := round(least(
        (v_item->>'line_subtotal')::numeric,
        case
          when v_campaign.discount_type = 'percentage'
            then (v_item->>'line_subtotal')::numeric * v_campaign.discount_value / 100
          else v_campaign.discount_value
        end,
        coalesce(v_campaign.maximum_discount_amount, (v_item->>'line_subtotal')::numeric)
      ), 2);
      v_campaign_discount := v_campaign_discount + v_line_discount;
      v_campaigns := v_campaigns || jsonb_build_array(jsonb_build_object(
        'id', v_campaign.id,
        'name', v_campaign.name,
        'slug', v_campaign.slug,
        'discount_type', v_campaign.discount_type,
        'discount_value', v_campaign.discount_value,
        'product_id', v_product.id,
        'amount', v_line_discount
      ));
    end if;
  end loop;

  v_remaining := greatest(0, v_subtotal - v_campaign_discount);
  if v_code <> '' then
    if p_lock_coupon then
      select * into v_coupon from public.coupons where code = v_code for update;
    else
      select * into v_coupon from public.coupons where code = v_code;
    end if;
    if not found
      or not v_coupon.is_active
      or v_coupon.starts_at > timezone('utc', now())
      or v_coupon.ends_at < timezone('utc', now()) then
      raise exception 'coupon_invalid';
    end if;
    if v_remaining < v_coupon.minimum_order_amount then
      raise exception 'coupon_minimum';
    end if;
    select count(*) into v_total_usage
    from public.coupon_usages where coupon_id = v_coupon.id;
    if v_coupon.usage_limit is not null and v_total_usage >= v_coupon.usage_limit then
      raise exception 'coupon_limit';
    end if;
    if v_coupon.usage_limit_per_user is not null then
      if auth.uid() is null then raise exception 'coupon_login_required'; end if;
      select count(*) into v_user_usage
      from public.coupon_usages
      where coupon_id = v_coupon.id and user_id = auth.uid();
      if v_user_usage >= v_coupon.usage_limit_per_user then
        raise exception 'coupon_user_limit';
      end if;
    end if;
    v_coupon_discount := round(least(
      v_remaining,
      case
        when v_coupon.discount_type = 'percentage'
          then v_remaining * v_coupon.discount_value / 100
        else v_coupon.discount_value
      end,
      coalesce(v_coupon.maximum_discount_amount, v_remaining)
    ), 2);
  end if;

  return jsonb_build_object(
    'subtotal', v_subtotal,
    'campaign_discount', v_campaign_discount,
    'coupon_discount', v_coupon_discount,
    'discount_total', least(v_subtotal, v_campaign_discount + v_coupon_discount),
    'payable_subtotal', greatest(0, v_subtotal - v_campaign_discount - v_coupon_discount),
    'items', v_lines,
    'campaigns', v_campaigns,
    'coupon', case
      when v_code = '' then null
      else jsonb_build_object(
        'id', v_coupon.id,
        'code', v_coupon.code,
        'description', v_coupon.description,
        'discount_type', v_coupon.discount_type,
        'discount_value', v_coupon.discount_value,
        'amount', v_coupon_discount
      )
    end
  );
end;
$$;

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
  if coalesce(p_payload->'delivery_address'->>'email', '') = ''
    or coalesce(p_payload->'delivery_address'->>'phone', '') = '' then
    raise exception 'invalid_contact';
  end if;
  if v_delivery not in ('standard', 'express', 'store')
    or v_payment not in ('card', 'transfer', 'cash') then
    raise exception 'invalid_method';
  end if;

  select * into v_carrier
  from public.shipping_carriers
  where provider_key = p_payload->>'selected_shipping_provider' and is_active;
  if not found
    or v_carrier.provider_key not in ('yurtici', 'mng', 'aras', 'surat', 'ptt', 'hepsijet') then
    raise exception 'invalid_shipping_provider';
  end if;

  v_pricing := public.compute_order_pricing(
    p_payload->'items',
    p_payload->>'coupon_code',
    true
  );

  loop
    v_order_number := 'CG-'
      || extract(year from timezone('utc', now()))::text
      || '-'
      || lpad(floor(random() * 100000000)::bigint::text, 8, '0');
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
  v_total := greatest(0, (v_pricing->>'payable_subtotal')::numeric + v_shipping);
  v_tax := round(v_total - (v_total / 1.20), 2);

  insert into public.orders(
    order_number, user_id, status, payment_method, payment_status,
    delivery_method, subtotal, discount_total, shipping_total, tax_total,
    grand_total, delivery_address, billing_address, status_history,
    coupon_snapshot, campaign_snapshots, selected_shipping_provider,
    selected_shipping_name, estimated_delivery_days, shipping_note,
    shipping_method_snapshot
  ) values (
    v_order_number, auth.uid(), 'received', v_payment, 'pending', v_delivery,
    (v_pricing->>'subtotal')::numeric,
    (v_pricing->>'discount_total')::numeric,
    v_shipping, v_tax, v_total,
    p_payload->'delivery_address', p_payload->'billing_address',
    jsonb_build_array(jsonb_build_object(
      'status', 'received', 'label', 'Sipariş alındı', 'at', timezone('utc', now())
    )),
    v_pricing->'coupon', v_pricing->'campaigns', v_carrier.provider_key,
    v_carrier.name, v_carrier.estimated_delivery_days,
    nullif(trim(p_payload->>'shipping_note'), ''),
    jsonb_build_object(
      'code', v_delivery,
      'carrier_id', v_carrier.id,
      'provider', v_carrier.provider_key,
      'name', v_carrier.name,
      'estimated_delivery_days', v_carrier.estimated_delivery_days,
      'note', nullif(trim(p_payload->>'shipping_note'), '')
    )
  ) returning id into v_order_id;

  for v_item in select value from jsonb_array_elements(v_pricing->'items')
  loop
    insert into public.order_items(
      order_id, product_id, variant_id, product_name, sku, quantity,
      unit_price, discount_total, line_total, product_snapshot
    ) values (
      v_order_id,
      (v_item->>'product_id')::uuid,
      nullif(v_item->>'variant_id', '')::uuid,
      v_item->>'name',
      v_item->>'sku',
      (v_item->>'quantity')::integer,
      (v_item->>'unit_price')::numeric,
      0,
      (v_item->>'line_subtotal')::numeric,
      jsonb_build_object(
        'slug', v_item->>'slug',
        'image_url', v_item->>'image_url',
        'variant_id', v_item->>'variant_id',
        'color_name', v_item->>'color_name',
        'color_hex', v_item->>'color_hex',
        'storage_value', nullif(v_item->>'storage_value', '')::integer,
        'storage_unit', v_item->>'storage_unit',
        'barcode', v_item->>'barcode'
      )
    );
  end loop;

  if jsonb_typeof(v_pricing->'coupon') = 'object' then
    insert into public.coupon_usages(coupon_id, user_id, order_id)
    values(
      (v_pricing->'coupon'->>'id')::uuid,
      auth.uid(),
      v_order_id
    );
  end if;

  return jsonb_build_object(
    'id', v_order_id,
    'order_number', v_order_number,
    'grand_total', v_total,
    'subtotal', (v_pricing->>'subtotal')::numeric,
    'discount_total', (v_pricing->>'discount_total')::numeric,
    'campaign_discount', (v_pricing->>'campaign_discount')::numeric,
    'coupon_discount', (v_pricing->>'coupon_discount')::numeric,
    'created_at', timezone('utc', now())
  );
end;
$$;

revoke all on function public.compute_order_pricing(jsonb, text, boolean) from public;
revoke all on function public.create_order_without_loyalty(jsonb) from public;
grant execute on function public.create_order_without_loyalty(jsonb) to anon, authenticated;

notify pgrst, 'reload schema';

commit;
