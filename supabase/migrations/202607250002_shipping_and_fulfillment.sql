begin;

alter table public.orders add column if not exists fulfillment_status text not null default 'unfulfilled';
alter table public.orders add column if not exists shipping_method text not null default 'standard';
alter table public.orders add column if not exists shipping_method_snapshot jsonb not null default '{"code":"standard","label":"Standart Kargo"}'::jsonb;
alter table public.orders drop constraint if exists orders_fulfillment_status_check;
alter table public.orders add constraint orders_fulfillment_status_check check (fulfillment_status in ('unfulfilled','partially_fulfilled','fulfilled','shipped','partially_delivered','delivered','returned','cancelled'));
alter table public.orders drop constraint if exists orders_shipping_method_check;
alter table public.orders add constraint orders_shipping_method_check check (shipping_method in ('standard','express','store_pickup','same_day'));

create table if not exists public.shipping_carriers(
 id uuid primary key default gen_random_uuid(), name text not null, code text not null unique, provider_key text not null unique,
 tracking_url_template text, logo_url text, support_phone text, description text, is_active boolean not null default true,
 is_default boolean not null default false, supports_api boolean not null default false,
 created_at timestamptz not null default timezone('utc',now()), updated_at timestamptz not null default timezone('utc',now()),
 constraint shipping_carrier_code check(code ~ '^[A-Z0-9_-]{2,32}$'),
 constraint shipping_tracking_template check(tracking_url_template is null or tracking_url_template like 'https://%{trackingNumber}%')
);
create unique index if not exists shipping_carriers_one_default on public.shipping_carriers(is_default) where is_default and is_active;

create table if not exists public.shipments(
 id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete restrict,
 carrier_id uuid not null references public.shipping_carriers(id) on delete restrict, provider_key text not null,
 shipment_number text not null unique, tracking_number text, tracking_url text, status text not null default 'pending',
 carrier_snapshot jsonb not null, recipient_snapshot jsonb not null, package_snapshot jsonb not null default '{}'::jsonb,
 shipping_cost numeric(12,2) not null default 0 check(shipping_cost>=0), currency text not null default 'TRY' check(currency='TRY'),
 admin_note text, shipped_at timestamptz, estimated_delivery_at timestamptz, delivered_at timestamptz, cancelled_at timestamptz,
 created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default timezone('utc',now()), updated_at timestamptz not null default timezone('utc',now()),
 constraint shipment_status check(status in('pending','preparing','ready_for_shipment','shipped','in_transit','out_for_delivery','delivered','delivery_failed','returned','cancelled'))
);
create unique index if not exists shipments_carrier_tracking_unique on public.shipments(carrier_id,tracking_number) where tracking_number is not null;
create index if not exists shipments_order_idx on public.shipments(order_id); create index if not exists shipments_status_idx on public.shipments(status,created_at desc);

create table if not exists public.shipment_items(
 id uuid primary key default gen_random_uuid(), shipment_id uuid not null references public.shipments(id) on delete cascade,
 order_item_id uuid not null references public.order_items(id) on delete restrict, quantity integer not null check(quantity>0),
 created_at timestamptz not null default timezone('utc',now()), unique(shipment_id,order_item_id)
);
create index if not exists shipment_items_order_item_idx on public.shipment_items(order_item_id);
create table if not exists public.shipment_events(
 id uuid primary key default gen_random_uuid(), shipment_id uuid not null references public.shipments(id) on delete cascade,
 status text not null, title text not null, description text, location text, event_time timestamptz not null default timezone('utc',now()),
 provider_event_code text, created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default timezone('utc',now()),
 constraint shipment_event_status check(status in('pending','preparing','ready_for_shipment','shipped','in_transit','out_for_delivery','delivered','delivery_failed','returned','cancelled'))
);
create index if not exists shipment_events_timeline_idx on public.shipment_events(shipment_id,event_time);

insert into public.shipping_carriers(name,code,provider_key,description,is_active,is_default,supports_api)
values('Manuel Kargo','MANUAL','manual','Manuel takip ve teslimat sağlayıcısı',true,true,false)
on conflict(code) do update set name=excluded.name;

create or replace function public.set_shipping_updated_at() returns trigger language plpgsql set search_path='' as $$ begin new.updated_at=timezone('utc',now());return new;end;$$;
drop trigger if exists shipping_carriers_updated on public.shipping_carriers; create trigger shipping_carriers_updated before update on public.shipping_carriers for each row execute function public.set_shipping_updated_at();
drop trigger if exists shipments_updated on public.shipments; create trigger shipments_updated before update on public.shipments for each row execute function public.set_shipping_updated_at();

create or replace function public.recalculate_order_fulfillment(p_order_id uuid) returns text language plpgsql security definer set search_path='' as $$
declare total_qty int; assigned_qty int; active_count int; delivered_count int; returned_count int; result text;
begin
 select coalesce(sum(quantity),0) into total_qty from public.order_items where order_id=p_order_id;
 select coalesce(sum(si.quantity),0),count(distinct s.id),count(distinct s.id) filter(where s.status='delivered'),count(distinct s.id) filter(where s.status='returned')
 into assigned_qty,active_count,delivered_count,returned_count from public.shipments s left join public.shipment_items si on si.shipment_id=s.id where s.order_id=p_order_id and s.status<>'cancelled';
 result:=case when active_count=0 then 'unfulfilled' when returned_count=active_count then 'returned' when delivered_count=active_count and assigned_qty>=total_qty then 'delivered' when delivered_count>0 then 'partially_delivered' when assigned_qty<total_qty then 'partially_fulfilled' when exists(select 1 from public.shipments where order_id=p_order_id and status in('shipped','in_transit','out_for_delivery')) then 'shipped' else 'fulfilled' end;
 update public.orders set fulfillment_status=result where id=p_order_id; return result;
end;$$;

create or replace function public.create_manual_shipment(p_order_id uuid,p_carrier_id uuid,p_items jsonb,p_tracking_number text default null,p_estimated_delivery_at timestamptz default null,p_package jsonb default '{}'::jsonb,p_shipping_cost numeric default 0,p_admin_note text default null) returns uuid language plpgsql security definer set search_path='' as $$
declare o public.orders%rowtype;c public.shipping_carriers%rowtype;s_id uuid;it jsonb;oi public.order_items%rowtype;sent int;qty int;number text;reservation_count int;
begin
 if not public.is_admin() then raise exception 'forbidden';end if;
 select * into o from public.orders where id=p_order_id for update;if not found or o.status='cancelled' then raise exception 'invalid_order';end if;
 select count(*) into reservation_count from public.inventory_reservations where order_id=p_order_id and status='completed';if reservation_count=0 then perform public.complete_order_inventory(p_order_id);end if;
 select * into c from public.shipping_carriers where id=p_carrier_id and is_active for share;if not found then raise exception 'inactive_carrier';end if;
 if not jsonb_typeof(p_items)='array' or jsonb_array_length(p_items)=0 then raise exception 'no_items';end if;
 if coalesce(p_shipping_cost,0)<0 then raise exception 'invalid_package';end if;
 if coalesce((p_package->>'package_count')::numeric,0)<0 or coalesce((p_package->>'weight')::numeric,0)<0 or coalesce((p_package->>'desi')::numeric,0)<0 then raise exception 'invalid_package';end if;
 number:='SHP-'||to_char(timezone('utc',now()),'YYYYMMDD')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
 insert into public.shipments(order_id,carrier_id,provider_key,shipment_number,tracking_number,tracking_url,status,carrier_snapshot,recipient_snapshot,package_snapshot,shipping_cost,estimated_delivery_at,admin_note,created_by)
 values(o.id,c.id,c.provider_key,number,nullif(trim(p_tracking_number),''),case when nullif(trim(p_tracking_number),'') is not null and c.tracking_url_template is not null then replace(c.tracking_url_template,'{trackingNumber}',replace(replace(trim(p_tracking_number),'%','%25'),' ','%20')) end,'ready_for_shipment',jsonb_build_object('name',c.name,'code',c.code,'logo_url',c.logo_url,'support_phone',c.support_phone),o.delivery_address,coalesce(p_package,'{}'::jsonb),coalesce(p_shipping_cost,0),p_estimated_delivery_at,nullif(trim(p_admin_note),''),auth.uid()) returning id into s_id;
 for it in select * from jsonb_array_elements(p_items) loop
  qty:=(it->>'quantity')::int;select * into oi from public.order_items where id=(it->>'order_item_id')::uuid and order_id=o.id for share;if not found or qty<=0 then raise exception 'invalid_item';end if;
  select coalesce(sum(si.quantity),0) into sent from public.shipment_items si join public.shipments s on s.id=si.shipment_id where si.order_item_id=oi.id and s.status<>'cancelled';if sent+qty>oi.quantity then raise exception 'quantity_exceeded';end if;
  insert into public.shipment_items(shipment_id,order_item_id,quantity) values(s_id,oi.id,qty);
 end loop;
 insert into public.shipment_events(shipment_id,status,title,description,created_by) values(s_id,'ready_for_shipment','Gönderi oluşturuldu','Manuel gönderi kaydı hazırlandı.',auth.uid());
 perform public.recalculate_order_fulfillment(o.id);update public.orders set status_history=coalesce(status_history,'[]'::jsonb)||jsonb_build_array(jsonb_build_object('status','shipment_created','label','Gönderi oluşturuldu: '||number,'at',timezone('utc',now()))) where id=o.id;return s_id;
end;$$;

create or replace function public.update_shipment_status(p_shipment_id uuid,p_status text,p_description text default null,p_location text default null) returns boolean language plpgsql security definer set search_path='' as $$
declare s public.shipments%rowtype;label text;
begin if not public.is_admin() then raise exception 'forbidden';end if;if p_status not in('pending','preparing','ready_for_shipment','shipped','in_transit','out_for_delivery','delivered','delivery_failed','returned','cancelled') then raise exception 'invalid_status';end if;
 select * into s from public.shipments where id=p_shipment_id for update;if not found then return false;end if;if s.status='delivered' and p_status<>'delivered' then raise exception 'delivered_locked';end if;if s.status=p_status then return true;end if;
 label:=case p_status when'pending'then'Bekliyor' when'preparing'then'Hazırlanıyor' when'ready_for_shipment'then'Gönderime hazır' when'shipped'then'Kargoya verildi' when'in_transit'then'Transfer sürecinde' when'out_for_delivery'then'Dağıtıma çıktı' when'delivered'then'Teslim edildi' when'delivery_failed'then'Teslim edilemedi' when'returned'then'İade edildi' else'İptal edildi'end;
 update public.shipments set status=p_status,shipped_at=case when p_status='shipped' then coalesce(shipped_at,timezone('utc',now())) else shipped_at end,delivered_at=case when p_status='delivered' then coalesce(delivered_at,timezone('utc',now())) else delivered_at end,cancelled_at=case when p_status='cancelled' then coalesce(cancelled_at,timezone('utc',now())) else cancelled_at end where id=s.id;
 insert into public.shipment_events(shipment_id,status,title,description,location,created_by) values(s.id,p_status,label,nullif(trim(p_description),''),nullif(trim(p_location),''),auth.uid());perform public.recalculate_order_fulfillment(s.order_id);return true;end;$$;

create or replace function public.update_shipment_tracking(p_shipment_id uuid,p_carrier_id uuid,p_tracking_number text,p_estimated_delivery_at timestamptz default null,p_admin_note text default null) returns boolean language plpgsql security definer set search_path='' as $$
declare s public.shipments%rowtype;c public.shipping_carriers%rowtype;t text;
begin if not public.is_admin() then raise exception 'forbidden';end if;select * into s from public.shipments where id=p_shipment_id for update;if not found or s.status='delivered' then raise exception 'shipment_locked';end if;select * into c from public.shipping_carriers where id=p_carrier_id and is_active;if not found then raise exception 'inactive_carrier';end if;t:=nullif(trim(p_tracking_number),'');
 update public.shipments set carrier_id=c.id,provider_key=c.provider_key,carrier_snapshot=jsonb_build_object('name',c.name,'code',c.code,'logo_url',c.logo_url,'support_phone',c.support_phone),tracking_number=t,tracking_url=case when t is not null and c.tracking_url_template is not null then replace(c.tracking_url_template,'{trackingNumber}',replace(replace(t,'%','%25'),' ','%20')) end,estimated_delivery_at=p_estimated_delivery_at,admin_note=nullif(trim(p_admin_note),'') where id=s.id;return true;exception when unique_violation then raise exception 'duplicate_tracking';end;$$;

create or replace function public.add_manual_shipment_event(p_shipment_id uuid,p_title text,p_description text,p_location text,p_event_time timestamptz default null) returns boolean language plpgsql security definer set search_path='' as $$
declare st text;begin if not public.is_admin() then raise exception 'forbidden';end if;select status into st from public.shipments where id=p_shipment_id;if not found or length(trim(p_title))<2 then return false;end if;insert into public.shipment_events(shipment_id,status,title,description,location,event_time,created_by) values(p_shipment_id,st,trim(p_title),nullif(trim(p_description),''),nullif(trim(p_location),''),coalesce(p_event_time,timezone('utc',now())),auth.uid());return true;end;$$;

create or replace function public.set_default_shipping_carrier(p_carrier_id uuid) returns boolean language plpgsql security definer set search_path='' as $$ begin if not public.is_admin() then raise exception 'forbidden';end if;if not exists(select 1 from public.shipping_carriers where id=p_carrier_id and is_active)then return false;end if;update public.shipping_carriers set is_default=false where is_default;update public.shipping_carriers set is_default=true where id=p_carrier_id;return true;end;$$;

alter table public.shipping_carriers enable row level security;alter table public.shipments enable row level security;alter table public.shipment_items enable row level security;alter table public.shipment_events enable row level security;
drop policy if exists carriers_public_read on public.shipping_carriers;create policy carriers_public_read on public.shipping_carriers for select using(is_active or public.is_admin());
drop policy if exists carriers_admin_write on public.shipping_carriers;create policy carriers_admin_write on public.shipping_carriers for all using(public.is_admin()) with check(public.is_admin());
drop policy if exists shipments_owner_admin_read on public.shipments;create policy shipments_owner_admin_read on public.shipments for select using(public.is_admin() or exists(select 1 from public.orders o where o.id=order_id and o.user_id=auth.uid()));
drop policy if exists shipment_items_owner_admin_read on public.shipment_items;create policy shipment_items_owner_admin_read on public.shipment_items for select using(public.is_admin() or exists(select 1 from public.shipments s join public.orders o on o.id=s.order_id where s.id=shipment_id and o.user_id=auth.uid()));
drop policy if exists shipment_events_owner_admin_read on public.shipment_events;create policy shipment_events_owner_admin_read on public.shipment_events for select using(public.is_admin() or exists(select 1 from public.shipments s join public.orders o on o.id=s.order_id where s.id=shipment_id and o.user_id=auth.uid()));
revoke insert,update,delete on public.shipments,public.shipment_items,public.shipment_events from anon,authenticated;
revoke all on function public.recalculate_order_fulfillment(uuid),public.create_manual_shipment(uuid,uuid,jsonb,text,timestamptz,jsonb,numeric,text),public.update_shipment_status(uuid,text,text,text),public.update_shipment_tracking(uuid,uuid,text,timestamptz,text),public.add_manual_shipment_event(uuid,text,text,text,timestamptz),public.set_default_shipping_carrier(uuid) from public;
grant execute on function public.create_manual_shipment(uuid,uuid,jsonb,text,timestamptz,jsonb,numeric,text),public.update_shipment_status(uuid,text,text,text),public.update_shipment_tracking(uuid,uuid,text,timestamptz,text),public.add_manual_shipment_event(uuid,text,text,text,timestamptz),public.set_default_shipping_carrier(uuid) to authenticated;
grant select on public.shipping_carriers to anon,authenticated;grant select on public.shipments,public.shipment_items,public.shipment_events to authenticated;

create or replace function public.get_order_by_reference(p_order_number text,p_contact text) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('order',to_jsonb(o),'items',coalesce((select jsonb_agg(to_jsonb(oi) order by oi.created_at) from public.order_items oi where oi.order_id=o.id),'[]'::jsonb),'shipments',coalesce((select jsonb_agg(to_jsonb(s)||jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(si)||jsonb_build_object('product_name',oi.product_name) order by si.created_at) from public.shipment_items si join public.order_items oi on oi.id=si.order_item_id where si.shipment_id=s.id),'[]'::jsonb),'events',coalesce((select jsonb_agg(to_jsonb(se) order by se.event_time) from public.shipment_events se where se.shipment_id=s.id),'[]'::jsonb)) order by s.created_at) from public.shipments s where s.order_id=o.id),'[]'::jsonb)) from public.orders o where upper(o.order_number)=upper(trim(p_order_number)) and(lower(o.delivery_address->>'email')=lower(trim(p_contact)) or regexp_replace(o.delivery_address->>'phone','\D','','g')=regexp_replace(p_contact,'\D','','g') or(o.user_id is not null and o.user_id=auth.uid())) limit 1;
$$;
commit;
