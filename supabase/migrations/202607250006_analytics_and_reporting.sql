create extension if not exists pgcrypto with schema extensions;

create table if not exists public.analytics_daily_metrics (
 id uuid primary key default gen_random_uuid(),metric_date date not null unique,gross_revenue numeric(14,2) not null default 0,net_revenue numeric(14,2) not null default 0,
 discount_total numeric(14,2) not null default 0,shipping_revenue numeric(14,2) not null default 0,tax_total numeric(14,2) not null default 0,refund_total numeric(14,2) not null default 0,
 order_count integer not null default 0,completed_order_count integer not null default 0,cancelled_order_count integer not null default 0,customer_count integer not null default 0,
 new_customer_count integer not null default 0,average_order_value numeric(14,2) not null default 0,items_sold integer not null default 0,
 created_at timestamptz not null default timezone('utc',now()),updated_at timestamptz not null default timezone('utc',now())
);
create table if not exists public.analytics_product_metrics (
 id uuid primary key default gen_random_uuid(),metric_date date not null,product_id uuid,product_name text not null,sku text not null,brand_name text,
 units_sold integer not null default 0,gross_revenue numeric(14,2) not null default 0,net_revenue numeric(14,2) not null default 0,discount_total numeric(14,2) not null default 0,
 refund_quantity integer not null default 0,refund_total numeric(14,2) not null default 0,order_count integer not null default 0,
 created_at timestamptz not null default timezone('utc',now()),updated_at timestamptz not null default timezone('utc',now()),unique(metric_date,product_id,sku)
);
create table if not exists public.analytics_customer_metrics (
 id uuid primary key default gen_random_uuid(),metric_date date not null,customer_id uuid references public.customer_profiles(id) on delete set null,customer_key text not null,
 order_count integer not null default 0,revenue numeric(14,2) not null default 0,items_purchased integer not null default 0,refund_total numeric(14,2) not null default 0,
 first_order_at timestamptz,last_order_at timestamptz,is_repeat_customer boolean not null default false,
 created_at timestamptz not null default timezone('utc',now()),updated_at timestamptz not null default timezone('utc',now()),unique(metric_date,customer_key)
);
create table if not exists public.analytics_events (
 id uuid primary key default gen_random_uuid(),event_name text not null,entity_type text not null,entity_id text not null,user_id uuid references auth.users(id) on delete set null,
 session_id text,payload jsonb not null default '{}'::jsonb,occurred_at timestamptz not null default timezone('utc',now()),created_at timestamptz not null default timezone('utc',now()),
 unique(event_name,entity_type,entity_id)
);
create index if not exists analytics_daily_date_idx on public.analytics_daily_metrics(metric_date desc);
create index if not exists analytics_product_date_revenue_idx on public.analytics_product_metrics(metric_date,net_revenue desc);
create index if not exists analytics_customer_date_revenue_idx on public.analytics_customer_metrics(metric_date,revenue desc);
create index if not exists analytics_events_occurred_idx on public.analytics_events(occurred_at desc,event_name);

alter table public.analytics_daily_metrics enable row level security;alter table public.analytics_product_metrics enable row level security;
alter table public.analytics_customer_metrics enable row level security;alter table public.analytics_events enable row level security;
revoke all on public.analytics_daily_metrics,public.analytics_product_metrics,public.analytics_customer_metrics,public.analytics_events from anon,authenticated;
grant select on public.analytics_daily_metrics,public.analytics_product_metrics,public.analytics_customer_metrics,public.analytics_events to authenticated;
create policy "Admins read daily analytics" on public.analytics_daily_metrics for select to authenticated using(public.is_admin());
create policy "Admins read product analytics" on public.analytics_product_metrics for select to authenticated using(public.is_admin());
create policy "Admins read customer analytics" on public.analytics_customer_metrics for select to authenticated using(public.is_admin());
create policy "Admins read analytics events" on public.analytics_events for select to authenticated using(public.is_admin());

create or replace function public.analytics_validate_range(p_start date,p_end date) returns boolean language plpgsql immutable set search_path='' as $$begin if p_start is null or p_end is null or p_start>p_end or p_end-p_start>366 then raise exception 'invalid_analytics_range' using errcode='22023';end if;return true;end$$;
create or replace function public.refresh_analytics_daily_metrics(start_date date,end_date date) returns integer language plpgsql security definer set search_path='' as $$declare v_count integer;begin if not public.is_admin() then raise exception 'admin_required' using errcode='42501';end if;perform public.analytics_validate_range(start_date,end_date);
insert into public.analytics_daily_metrics(metric_date,gross_revenue,net_revenue,discount_total,shipping_revenue,tax_total,refund_total,order_count,completed_order_count,cancelled_order_count,customer_count,new_customer_count,average_order_value,items_sold)
select d::date,
 coalesce(sum(o.subtotal+o.discount_total) filter(where o.status<>'cancelled'),0),
 coalesce(sum(o.grand_total) filter(where o.status='delivered' and o.payment_status='paid'),0)-coalesce(sum(r.refund),0),
 coalesce(sum(o.discount_total) filter(where o.status<>'cancelled'),0),coalesce(sum(o.shipping_total) filter(where o.status<>'cancelled'),0),coalesce(sum(o.tax_total) filter(where o.status<>'cancelled'),0),coalesce(sum(r.refund),0),
 count(o.id),count(o.id) filter(where o.status='delivered'),count(o.id) filter(where o.status='cancelled'),count(distinct o.user_id),
 (select count(*) from public.customer_profiles c where c.created_at::date=d::date),
 coalesce(avg(o.grand_total) filter(where o.status<>'cancelled'),0),coalesce(sum(i.items) filter(where o.status<>'cancelled'),0)
from generate_series(start_date,end_date,'1 day') d left join public.orders o on o.created_at::date=d::date
left join (select order_id,sum(amount) refund from public.payment_transactions where transaction_type='refund' or status='refunded' group by order_id) r on r.order_id=o.id
left join (select order_id,sum(quantity) items from public.order_items group by order_id)i on i.order_id=o.id group by d
on conflict(metric_date) do update set gross_revenue=excluded.gross_revenue,net_revenue=greatest(excluded.net_revenue,0),discount_total=excluded.discount_total,shipping_revenue=excluded.shipping_revenue,tax_total=excluded.tax_total,refund_total=excluded.refund_total,order_count=excluded.order_count,completed_order_count=excluded.completed_order_count,cancelled_order_count=excluded.cancelled_order_count,customer_count=excluded.customer_count,new_customer_count=excluded.new_customer_count,average_order_value=excluded.average_order_value,items_sold=excluded.items_sold,updated_at=timezone('utc',now());
get diagnostics v_count=row_count;perform public.write_audit_log('analytics_refreshed','system',null,'Günlük analitik',null,null,jsonb_build_object('start_date',start_date,'end_date',end_date,'report_type','daily','row_count',v_count));return v_count;end$$;

create or replace function public.refresh_analytics_product_metrics(start_date date,end_date date) returns integer language plpgsql security definer set search_path='' as $$declare v_count integer;begin if not public.is_admin() then raise exception 'admin_required' using errcode='42501';end if;perform public.analytics_validate_range(start_date,end_date);
delete from public.analytics_product_metrics where metric_date between start_date and end_date;
insert into public.analytics_product_metrics(metric_date,product_id,product_name,sku,brand_name,units_sold,gross_revenue,net_revenue,discount_total,refund_quantity,refund_total,order_count)
select o.created_at::date,oi.product_id,oi.product_name,oi.sku,coalesce(oi.product_snapshot->>'brand',''),sum(oi.quantity) filter(where o.status<>'cancelled'),sum(oi.unit_price*oi.quantity) filter(where o.status<>'cancelled'),sum(oi.line_total) filter(where o.status='delivered' and o.payment_status='paid'),sum(oi.discount_total) filter(where o.status<>'cancelled'),coalesce(sum(oi.quantity) filter(where o.status='returned'),0),coalesce(sum(oi.line_total) filter(where o.status='returned'),0),count(distinct o.id) filter(where o.status<>'cancelled')
from public.order_items oi join public.orders o on o.id=oi.order_id where o.created_at::date between start_date and end_date group by o.created_at::date,oi.product_id,oi.product_name,oi.sku,oi.product_snapshot->>'brand';get diagnostics v_count=row_count;perform public.write_audit_log('analytics_refreshed','system',null,'Ürün analitiği',null,null,jsonb_build_object('start_date',start_date,'end_date',end_date,'report_type','products','row_count',v_count));return v_count;end$$;

create or replace function public.refresh_analytics_customer_metrics(start_date date,end_date date) returns integer language plpgsql security definer set search_path='' as $$declare v_count integer;begin if not public.is_admin() then raise exception 'admin_required' using errcode='42501';end if;perform public.analytics_validate_range(start_date,end_date);
delete from public.analytics_customer_metrics where metric_date between start_date and end_date;
insert into public.analytics_customer_metrics(metric_date,customer_id,customer_key,order_count,revenue,items_purchased,refund_total,first_order_at,last_order_at,is_repeat_customer)
select o.created_at::date,c.id,coalesce(c.id::text,'guest:'||encode(extensions.digest(coalesce(o.delivery_address->>'email',o.order_number),'sha256'),'hex')),count(distinct o.id) filter(where o.status<>'cancelled'),coalesce(sum(o.grand_total) filter(where o.status='delivered' and o.payment_status='paid'),0),coalesce(sum(i.items) filter(where o.status<>'cancelled'),0),coalesce(sum(r.refund),0),min(o.created_at),max(o.created_at),count(distinct o.id) filter(where o.status<>'cancelled')>1
from public.orders o left join public.customer_profiles c on c.user_id=o.user_id left join(select order_id,sum(quantity)items from public.order_items group by order_id)i on i.order_id=o.id left join(select order_id,sum(amount)refund from public.payment_transactions where transaction_type='refund' or status='refunded' group by order_id)r on r.order_id=o.id where o.created_at::date between start_date and end_date group by o.created_at::date,c.id,coalesce(c.id::text,'guest:'||encode(extensions.digest(coalesce(o.delivery_address->>'email',o.order_number),'sha256'),'hex'));get diagnostics v_count=row_count;perform public.write_audit_log('analytics_refreshed','system',null,'Müşteri analitiği',null,null,jsonb_build_object('start_date',start_date,'end_date',end_date,'report_type','customers','row_count',v_count));return v_count;end$$;

revoke all on function public.refresh_analytics_daily_metrics(date,date),public.refresh_analytics_product_metrics(date,date),public.refresh_analytics_customer_metrics(date,date) from public,anon;
grant execute on function public.refresh_analytics_daily_metrics(date,date),public.refresh_analytics_product_metrics(date,date),public.refresh_analytics_customer_metrics(date,date) to authenticated;

create or replace function public.analytics_order_event() returns trigger language plpgsql security definer set search_path='' as $$declare v_event text;begin v_event:=case when tg_op='INSERT' then 'order_created' when new.status='delivered' and old.status is distinct from new.status then 'order_completed' when new.status='cancelled' and old.status is distinct from new.status then 'order_cancelled' else null end;if v_event is not null then insert into public.analytics_events(event_name,entity_type,entity_id,user_id,payload,occurred_at)values(v_event,'order',new.id::text,new.user_id,jsonb_build_object('order_number',new.order_number,'status',new.status),new.updated_at)on conflict do nothing;end if;return new;end$$;
drop trigger if exists analytics_orders_events on public.orders;create trigger analytics_orders_events after insert or update of status on public.orders for each row execute function public.analytics_order_event();
create or replace function public.analytics_payment_event() returns trigger language plpgsql security definer set search_path='' as $$declare v_event text;begin v_event:=case when new.status='paid' then 'payment_succeeded' when new.status='failed' then 'payment_failed' when new.status='refunded' or new.transaction_type='refund' then 'refund_completed' else null end;if v_event is not null then insert into public.analytics_events(event_name,entity_type,entity_id,payload,occurred_at)values(v_event,'payment',new.id::text,jsonb_build_object('order_id',new.order_id,'status',new.status),new.updated_at)on conflict do nothing;end if;return new;end$$;
drop trigger if exists analytics_payment_events on public.payment_transactions;create trigger analytics_payment_events after insert or update of status on public.payment_transactions for each row execute function public.analytics_payment_event();
create or replace function public.analytics_shipment_event() returns trigger language plpgsql security definer set search_path='' as $$declare v_event text;begin v_event:=case when new.status in('shipped','in_transit') then 'shipment_shipped' when new.status='delivered' then 'shipment_delivered' else null end;if v_event is not null then insert into public.analytics_events(event_name,entity_type,entity_id,payload,occurred_at)values(v_event,'shipment',new.id::text,jsonb_build_object('order_id',new.order_id,'status',new.status),new.updated_at)on conflict do nothing;end if;return new;end$$;
drop trigger if exists analytics_shipment_events on public.shipments;create trigger analytics_shipment_events after insert or update of status on public.shipments for each row execute function public.analytics_shipment_event();
create or replace function public.analytics_customer_event() returns trigger language plpgsql security definer set search_path='' as $$begin insert into public.analytics_events(event_name,entity_type,entity_id,user_id,payload,occurred_at)values('customer_registered','customer',new.id::text,new.user_id,'{}'::jsonb,new.created_at)on conflict do nothing;return new;end$$;
drop trigger if exists analytics_customer_events on public.customer_profiles;create trigger analytics_customer_events after insert on public.customer_profiles for each row execute function public.analytics_customer_event();
