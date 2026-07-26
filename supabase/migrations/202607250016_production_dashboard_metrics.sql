begin;

create or replace function public.admin_dashboard_metrics()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'core', jsonb_build_object(
      'products', (select count(*) from public.products),
      'customers', (select count(*) from public.customer_profiles),
      'orders', (select count(*) from public.orders),
      'netRevenue', (select coalesce(sum(grand_total), 0) from public.orders where payment_status = 'paid' and status <> 'cancelled')
    ),
    'inventory', jsonb_build_object(
      'total', (select coalesce(sum(quantity_on_hand), 0) from public.inventory),
      'reserved', (select coalesce(sum(quantity_reserved), 0) from public.inventory),
      'outOfStock', (select count(distinct product_id) from public.inventory where quantity_on_hand - quantity_reserved = 0),
      'critical', (select count(distinct product_id) from public.inventory where quantity_on_hand - quantity_reserved > 0 and quantity_on_hand - quantity_reserved <= reorder_level)
    ),
    'crm', jsonb_build_object(
      'total', (select count(*) from public.customer_profiles),
      'active', (select count(*) from public.customer_profiles where status = 'active'),
      'vip', (select count(*) from public.customer_profiles where segment = 'vip'),
      'newCustomers', (select count(*) from public.customer_profiles where created_at >= timezone('utc', now()) - interval '30 days'),
      'blocked', (select count(*) from public.customer_profiles where status = 'blocked')
    ),
    'shipping', jsonb_build_object(
      'ready', (select count(*) from public.shipments where status = 'ready_for_shipment'),
      'shipped', (select count(*) from public.shipments where status = 'shipped'),
      'transit', (select count(*) from public.shipments where status in ('in_transit', 'out_for_delivery')),
      'deliveredToday', (select count(*) from public.shipments where delivered_at >= date_trunc('day', timezone('utc', now())) and delivered_at < date_trunc('day', timezone('utc', now())) + interval '1 day'),
      'failed', (select count(*) from public.shipments where status = 'delivery_failed')
    ),
    'analytics', jsonb_build_object(
      'todayRevenue', (select coalesce(sum(grand_total), 0) from public.orders where payment_status = 'paid' and status <> 'cancelled' and created_at >= date_trunc('day', timezone('utc', now()))),
      'weekRevenue', (select coalesce(sum(grand_total), 0) from public.orders where payment_status = 'paid' and status <> 'cancelled' and created_at >= timezone('utc', now()) - interval '7 days'),
      'todayOrders', (select count(*) from public.orders where created_at >= date_trunc('day', timezone('utc', now()))),
      'averageOrder', (select coalesce(avg(grand_total), 0) from public.orders where payment_status = 'paid' and status <> 'cancelled' and created_at >= timezone('utc', now()) - interval '7 days'),
      'newCustomersToday', (select count(*) from public.customer_profiles where created_at >= date_trunc('day', timezone('utc', now())))
    )
  );
end;
$$;

revoke all on function public.admin_dashboard_metrics() from public, anon;
grant execute on function public.admin_dashboard_metrics() to authenticated;

commit;
