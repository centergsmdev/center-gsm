begin;

alter table public.shipping_carriers add column if not exists estimated_delivery_days integer not null default 3 check(estimated_delivery_days between 1 and 30);
alter table public.shipping_carriers add column if not exists free_shipping_label text not null default 'Sipariş koşullarına göre ücretsiz';
alter table public.shipping_carriers add column if not exists customer_description text;
alter table public.orders add column if not exists selected_shipping_provider text;
alter table public.orders add column if not exists selected_shipping_name text;
alter table public.orders add column if not exists estimated_delivery_days integer check(estimated_delivery_days between 1 and 30);
alter table public.orders add column if not exists shipping_note text;
alter table public.shipments drop constraint if exists shipment_status;
alter table public.shipments add constraint shipment_status check(status in('pending','preparing','ready_for_shipment','shipped','in_transit','out_for_delivery','delivered','delivery_failed','return_started','returned','cancelled'));
alter table public.shipment_events drop constraint if exists shipment_event_status;
alter table public.shipment_events add constraint shipment_event_status check(status in('pending','preparing','ready_for_shipment','shipped','in_transit','out_for_delivery','delivered','delivery_failed','return_started','returned','cancelled'));

update public.shipping_carriers set estimated_delivery_days=case provider_key when 'hepsijet' then 2 when 'yurtici' then 2 when 'aras' then 3 when 'mng' then 3 when 'surat' then 3 when 'ptt' then 4 else 3 end,
free_shipping_label='2.500 TL üzeri ücretsiz',customer_description=coalesce(customer_description,'Türkiye geneli güvenli teslimat')
where provider_key in ('yurtici','mng','aras','surat','ptt','hepsijet');
update public.shipping_carriers set is_default=false where is_default;
update public.shipping_carriers set is_active=true,is_default=(provider_key='yurtici') where provider_key in ('yurtici','mng','aras','surat','ptt','hepsijet');

create or replace function public.create_order(p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_order_id uuid; v_order_number text; v_item jsonb; v_pricing jsonb; v_shipping numeric(12,2); v_total numeric(12,2); v_tax numeric(12,2);
  v_delivery text := p_payload->>'delivery_method'; v_payment text := p_payload->>'payment_method'; v_carrier public.shipping_carriers%rowtype;
begin
  if coalesce(p_payload->'delivery_address'->>'email','')='' or coalesce(p_payload->'delivery_address'->>'phone','')='' then raise exception 'invalid_contact'; end if;
  if v_delivery not in ('standard','express','store') or v_payment not in ('card','transfer','cash') then raise exception 'invalid_method'; end if;
  select * into v_carrier from public.shipping_carriers where provider_key=p_payload->>'selected_shipping_provider' and is_active;
  if not found or v_carrier.provider_key not in ('yurtici','mng','aras','surat','ptt','hepsijet') then raise exception 'invalid_shipping_provider'; end if;
  v_pricing := public.compute_order_pricing(p_payload->'items',p_payload->>'coupon_code',true);
  loop v_order_number := 'CG-'||extract(year from timezone('utc',now()))::text||'-'||lpad(floor(random()*100000000)::bigint::text,8,'0'); exit when not exists(select 1 from public.orders where order_number=v_order_number); end loop;
  v_shipping := case when v_delivery='express' then 199 when (v_pricing->>'payable_subtotal')::numeric<2500 and v_delivery='standard' then 149 else 0 end;
  v_total := greatest(0,(v_pricing->>'payable_subtotal')::numeric+v_shipping); v_tax := round(v_total-(v_total/1.20),2);
  insert into public.orders(order_number,user_id,status,payment_method,payment_status,delivery_method,subtotal,discount_total,shipping_total,tax_total,grand_total,delivery_address,billing_address,status_history,coupon_snapshot,campaign_snapshots,selected_shipping_provider,selected_shipping_name,estimated_delivery_days,shipping_note,shipping_method_snapshot)
  values(v_order_number,auth.uid(),'received',v_payment,'pending',v_delivery,(v_pricing->>'subtotal')::numeric,(v_pricing->>'discount_total')::numeric,v_shipping,v_tax,v_total,p_payload->'delivery_address',p_payload->'billing_address',jsonb_build_array(jsonb_build_object('status','received','label','Sipariş alındı','at',timezone('utc',now()))),v_pricing->'coupon',v_pricing->'campaigns',v_carrier.provider_key,v_carrier.name,v_carrier.estimated_delivery_days,nullif(trim(p_payload->>'shipping_note'),''),jsonb_build_object('code',v_delivery,'carrier_id',v_carrier.id,'provider',v_carrier.provider_key,'name',v_carrier.name,'estimated_delivery_days',v_carrier.estimated_delivery_days,'note',nullif(trim(p_payload->>'shipping_note'),''))) returning id into v_order_id;
  for v_item in select value from jsonb_array_elements(v_pricing->'items') loop insert into public.order_items(order_id,product_id,product_name,sku,quantity,unit_price,discount_total,line_total,product_snapshot) values(v_order_id,(v_item->>'product_id')::uuid,v_item->>'name',v_item->>'sku',(v_item->>'quantity')::integer,(v_item->>'unit_price')::numeric,0,(v_item->>'line_subtotal')::numeric,jsonb_build_object('slug',v_item->>'slug','image_url',v_item->>'image_url')); end loop;
  if v_pricing->'coupon' is not null then insert into public.coupon_usages(coupon_id,user_id,order_id) values((v_pricing->'coupon'->>'id')::uuid,auth.uid(),v_order_id); end if;
  return jsonb_build_object('id',v_order_id,'order_number',v_order_number,'grand_total',v_total,'subtotal',(v_pricing->>'subtotal')::numeric,'discount_total',(v_pricing->>'discount_total')::numeric,'campaign_discount',(v_pricing->>'campaign_discount')::numeric,'coupon_discount',(v_pricing->>'coupon_discount')::numeric,'created_at',timezone('utc',now()));
end;$$;

create or replace function public.admin_update_shipping_experience(p_carrier_id uuid,p_is_active boolean,p_is_default boolean,p_estimated_days integer,p_free_label text,p_description text,p_logo_url text) returns boolean language plpgsql security definer set search_path='' as $$
begin if not public.is_admin() then raise exception 'admin_required'; end if; if p_estimated_days not between 1 and 30 then raise exception 'invalid_estimate'; end if;
if p_is_default then update public.shipping_carriers set is_default=false where is_default; end if;
update public.shipping_carriers set is_active=p_is_active,is_default=p_is_default,estimated_delivery_days=p_estimated_days,free_shipping_label=left(trim(p_free_label),120),customer_description=left(trim(p_description),240),logo_url=nullif(trim(p_logo_url),'') where id=p_carrier_id;
perform public.write_audit_log('shipping_carrier_updated','shipment',p_carrier_id::text,'Shipping carrier',null,jsonb_build_object('is_active',p_is_active,'is_default',p_is_default,'estimated_days',p_estimated_days),'{}'); return found; end$$;

create or replace function public.admin_update_manual_shipment(p_shipment_id uuid,p_carrier_id uuid,p_tracking_number text,p_tracking_url text,p_shipping_note text,p_estimated_at timestamptz,p_status text) returns boolean language plpgsql security definer set search_path='' as $$
declare v_old public.shipments%rowtype; v_carrier public.shipping_carriers%rowtype; v_label text; v_customer uuid;
begin if not public.is_admin() then raise exception 'admin_required'; end if; if p_status not in ('preparing','shipped','in_transit','out_for_delivery','delivered','delivery_failed','return_started','returned','cancelled') then raise exception 'invalid_status'; end if;
select * into v_old from public.shipments where id=p_shipment_id for update; if not found then raise exception 'shipment_not_found'; end if; select * into v_carrier from public.shipping_carriers where id=p_carrier_id and is_active; if not found then raise exception 'inactive_carrier'; end if;
if nullif(trim(p_tracking_url),'') is not null and trim(p_tracking_url) not like 'https://%' then raise exception 'invalid_tracking_url'; end if;
v_label:=case p_status when 'preparing' then 'Hazırlanıyor' when 'shipped' then 'Kargoya verildi' when 'in_transit' then 'Transfer sürecinde' when 'out_for_delivery' then 'Dağıtıma çıktı' when 'delivered' then 'Teslim edildi' when 'delivery_failed' then 'Teslim edilemedi' when 'return_started' then 'İade sürecinde' when 'returned' then 'İade edildi' else 'İptal edildi' end;
update public.shipments set carrier_id=v_carrier.id,provider_key=v_carrier.provider_key,carrier_snapshot=jsonb_build_object('name',v_carrier.name,'code',v_carrier.code,'logo_url',v_carrier.logo_url),tracking_number=nullif(trim(p_tracking_number),''),tracking_url=nullif(trim(p_tracking_url),''),admin_note=nullif(trim(p_shipping_note),''),estimated_delivery_at=p_estimated_at,status=p_status,shipped_at=case when p_status='shipped' then coalesce(shipped_at,timezone('utc',now())) else shipped_at end,delivered_at=case when p_status='delivered' then coalesce(delivered_at,timezone('utc',now())) else delivered_at end where id=p_shipment_id;
if v_old.status<>p_status then insert into public.shipment_events(shipment_id,status,title,description,created_by) values(p_shipment_id,p_status,v_label,'Manuel operasyon güncellemesi',auth.uid()); end if;
insert into public.notification_events(event_type,entity_type,entity_id,payload,status) values(case when v_old.tracking_number is distinct from nullif(trim(p_tracking_number),'') then 'shipment_tracking_added' else 'shipment_status_changed' end,'shipment',p_shipment_id::text,jsonb_build_object('status',p_status,'tracking_number',nullif(trim(p_tracking_number),'')),'pending');
insert into public.analytics_events(event_name,entity_type,entity_id,payload) values(case when p_status='delivered' then 'shipment_delivered' when p_status='returned' then 'shipment_returned' else 'shipment_status_changed' end,'shipment',p_shipment_id::text,jsonb_build_object('status',p_status)) on conflict do nothing;
select cp.id into v_customer from public.customer_profiles cp join public.orders o on o.user_id=cp.user_id where o.id=v_old.order_id; if v_customer is not null and (v_old.tracking_number is distinct from nullif(trim(p_tracking_number),'') or p_status in ('shipped','delivered','return_started','returned')) then insert into public.customer_activity(customer_id,activity_type,description,metadata) values(v_customer,'shipment_update',v_label,jsonb_build_object('shipment_id',p_shipment_id,'status',p_status)); end if;
perform public.write_audit_log('shipment_updated','shipment',p_shipment_id::text,v_old.shipment_number,to_jsonb(v_old)-'recipient_snapshot',jsonb_build_object('carrier_id',p_carrier_id,'tracking_number',nullif(trim(p_tracking_number),''),'tracking_url',nullif(trim(p_tracking_url),''),'status',p_status),jsonb_build_object('order_id',v_old.order_id)); perform public.recalculate_order_fulfillment(v_old.order_id); return true; end$$;

revoke all on function public.admin_update_shipping_experience(uuid,boolean,boolean,integer,text,text,text),public.admin_update_manual_shipment(uuid,uuid,text,text,text,timestamptz,text) from public,anon;
grant execute on function public.admin_update_shipping_experience(uuid,boolean,boolean,integer,text,text,text),public.admin_update_manual_shipment(uuid,uuid,text,text,text,timestamptz,text) to authenticated;
revoke all on function public.create_order(jsonb) from public; grant execute on function public.create_order(jsonb) to anon,authenticated;
commit;
