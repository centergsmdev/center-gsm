begin;

create or replace function public.create_order_without_credit(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
  v_points bigint := coalesce((p_payload->>'loyalty_points')::bigint,0);
  v_discount numeric := 0;
  v_order uuid;
begin
  v_result := public.create_order_without_loyalty(p_payload-'loyalty_points');
  v_order := (v_result->>'id')::uuid;

  if v_points > 0 then
    v_discount := public.redeem_loyalty_points(v_points,v_order);

    select jsonb_build_object(
      'id',o.id,
      'order_number',o.order_number,
      'grand_total',o.grand_total,
      'created_at',o.created_at,
      'subtotal',o.subtotal,
      'discount_total',o.discount_total,
      'campaign_discount',coalesce((
        select sum((campaign->>'amount')::numeric)
        from jsonb_array_elements(o.campaign_snapshots) campaign
      ),0),
      'coupon_discount',o.coupon_discount_amount,
      'loyalty_discount',o.loyalty_discount,
      'loyalty_points_redeemed',o.loyalty_points_redeemed
    )
    into v_result
    from public.orders o
    where o.id = v_order;
  end if;

  return v_result;
end;
$$;

create or replace function public.create_order_without_manual_approval(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  r jsonb;
  v_id uuid;
  v_gift numeric := 0;
  v_credit numeric := 0;
begin
  r := public.create_order_without_credit(
    p_payload-'gift_card_code'-'gift_card_amount'-'store_credit_amount'
  );
  v_id := (r->>'id')::uuid;

  if nullif(trim(p_payload->>'gift_card_code'),'') is not null then
    v_gift := public.redeem_gift_card(
      p_payload->>'gift_card_code',
      v_id,
      nullif(p_payload->>'gift_card_amount','')::numeric
    );
  end if;

  if coalesce((p_payload->>'store_credit_amount')::numeric,0) > 0 then
    v_credit := public.spend_store_credit(
      (p_payload->>'store_credit_amount')::numeric,
      v_id
    );
  end if;

  select jsonb_build_object(
    'id',o.id,
    'order_number',o.order_number,
    'grand_total',o.grand_total,
    'created_at',o.created_at,
    'subtotal',o.subtotal,
    'discount_total',o.discount_total,
    'campaign_discount',coalesce((
      select sum((campaign->>'amount')::numeric)
      from jsonb_array_elements(o.campaign_snapshots) campaign
    ),0),
    'coupon_discount',o.coupon_discount_amount,
    'loyalty_discount',o.loyalty_discount,
    'loyalty_points_redeemed',o.loyalty_points_redeemed,
    'gift_card_amount',o.gift_card_amount,
    'store_credit_amount',o.store_credit_amount
  )
  into r
  from public.orders o
  where o.id = v_id;

  return r;
end;
$$;

revoke all on function public.create_order_without_credit(jsonb) from public;
revoke all on function public.create_order_without_manual_approval(jsonb) from public;
grant execute on function public.create_order_without_credit(jsonb)
  to anon, authenticated;
grant execute on function public.create_order_without_manual_approval(jsonb)
  to anon, authenticated;

notify pgrst, 'reload schema';

commit;
