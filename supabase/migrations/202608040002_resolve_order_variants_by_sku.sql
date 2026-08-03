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

      if found then
        if v_product.stock_quantity < v_quantity then
          raise exception 'product_unavailable';
        end if;
        v_unit_price := v_product.price;
      else
        select pv.*
        into v_variant
        from public.product_variants pv
        join public.products p on p.id = pv.product_id
        where pv.sku = v_item->>'sku'
          and pv.is_active
          and p.is_active
        limit 1;

        if not found or v_variant.stock_quantity < v_quantity then
          raise exception 'product_unavailable';
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
      end if;
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

notify pgrst, 'reload schema';

commit;

