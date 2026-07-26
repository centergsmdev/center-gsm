-- Wishlist automation and customer alerts. Apply manually after review.
create type public.wishlist_alert_type as enum ('price_drop','back_in_stock','promotion_started');
create type public.wishlist_alert_status as enum ('pending','processing','completed','failed','cancelled');

create table public.wishlist_alert_preferences (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  price_drop boolean not null default false, back_in_stock boolean not null default false,
  promotion_started boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(user_id, product_id)
);
create table public.wishlist_alert_events (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  event_type public.wishlist_alert_type not null, idempotency_key text not null unique,
  payload jsonb not null default '{}'::jsonb, status public.wishlist_alert_status not null default 'pending',
  created_at timestamptz not null default now(), processed_at timestamptz, cancelled_at timestamptz
);
create table public.wishlist_alert_deliveries (
  id uuid primary key default gen_random_uuid(), event_id uuid not null references public.wishlist_alert_events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, channel text not null default 'in_app' check(channel in ('in_app','email','sms','push')),
  status public.wishlist_alert_status not null default 'pending', attempt_count integer not null default 0 check(attempt_count >= 0),
  last_error text, delivered_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(event_id, channel)
);
create table public.product_price_history (
  id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete cascade,
  old_price numeric(12,2) not null, new_price numeric(12,2) not null, change_percentage numeric(8,2) not null,
  source text not null default 'product_update', changed_at timestamptz not null default now(),
  check(old_price <> new_price)
);
create table public.product_stock_history (
  id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete cascade,
  old_stock integer not null, new_stock integer not null, old_status text not null, new_status text not null,
  warehouse_id uuid references public.warehouses(id) on delete set null, changed_at timestamptz not null default now(),
  check(old_stock <> new_stock)
);

create index wishlist_preferences_user_idx on public.wishlist_alert_preferences(user_id);
create index wishlist_preferences_product_idx on public.wishlist_alert_preferences(product_id);
create index wishlist_events_user_status_idx on public.wishlist_alert_events(user_id,status,created_at desc);
create index wishlist_events_product_type_idx on public.wishlist_alert_events(product_id,event_type,created_at desc);
create index wishlist_deliveries_status_idx on public.wishlist_alert_deliveries(status,created_at);
create index price_history_product_idx on public.product_price_history(product_id,changed_at desc);
create index stock_history_product_idx on public.product_stock_history(product_id,changed_at desc);

alter table public.wishlist_alert_preferences enable row level security;
alter table public.wishlist_alert_events enable row level security;
alter table public.wishlist_alert_deliveries enable row level security;
alter table public.product_price_history enable row level security;
alter table public.product_stock_history enable row level security;

create policy wishlist_preferences_own_read on public.wishlist_alert_preferences for select using (user_id = auth.uid());
create policy wishlist_events_own_or_admin_read on public.wishlist_alert_events for select using (user_id = auth.uid() or public.current_user_is_admin());
create policy wishlist_deliveries_own_or_admin_read on public.wishlist_alert_deliveries for select using (user_id = auth.uid() or public.current_user_is_admin());
create policy wishlist_price_history_admin_read on public.product_price_history for select using (public.current_user_is_admin());
create policy wishlist_stock_history_admin_read on public.product_stock_history for select using (public.current_user_is_admin());
grant select on public.wishlist_alert_preferences, public.wishlist_alert_events, public.wishlist_alert_deliveries to authenticated;
grant select on public.product_price_history, public.product_stock_history to authenticated;

create or replace function public.set_wishlist_alert_preference(p_product_id uuid,p_price_drop boolean,p_back_in_stock boolean,p_promotion_started boolean)
returns boolean language plpgsql security definer set search_path=public,auth as $$
begin
  if auth.uid() is null or not exists(select 1 from public.favorites where user_id=auth.uid() and product_id=p_product_id) then raise exception 'not_allowed'; end if;
  insert into public.wishlist_alert_preferences(user_id,product_id,price_drop,back_in_stock,promotion_started)
  values(auth.uid(),p_product_id,p_price_drop,p_back_in_stock,p_promotion_started)
  on conflict(user_id,product_id) do update set price_drop=excluded.price_drop,back_in_stock=excluded.back_in_stock,promotion_started=excluded.promotion_started,updated_at=now();
  insert into public.customer_activity(customer_id,activity_type,description,metadata)
  select id,case when p_price_drop or p_back_in_stock or p_promotion_started then 'wishlist_alert_enabled' else 'wishlist_alert_disabled' end,'Favori alarm tercihi güncellendi',jsonb_build_object('product_id',p_product_id) from public.customer_profiles where user_id=auth.uid();
  insert into public.analytics_events(event_name,user_id,entity_type,entity_id,payload)
  select case when p_price_drop then 'price_alert_enabled' when p_back_in_stock then 'stock_alert_enabled' else 'promotion_alert_enabled' end,auth.uid(),'product',p_product_id::text,jsonb_build_object('preference',true)
  where p_price_drop or p_back_in_stock or p_promotion_started;
  return true;
end $$;

create or replace function public.create_wishlist_alert_event(p_product_id uuid,p_event_type text,p_payload jsonb default '{}'::jsonb,p_idempotency_key text default '')
returns integer language plpgsql security definer set search_path=public,auth as $$
declare v_count integer:=0; v_pref record; v_event uuid;
begin
  if p_event_type not in ('price_drop','back_in_stock','promotion_started') then raise exception 'invalid_type'; end if;
  if auth.uid() is not null and not public.current_user_is_admin() then raise exception 'not_allowed'; end if;
  for v_pref in select * from public.wishlist_alert_preferences where product_id=p_product_id and case p_event_type when 'price_drop' then price_drop when 'back_in_stock' then back_in_stock else promotion_started end loop
    insert into public.wishlist_alert_events(user_id,product_id,event_type,idempotency_key,payload)
    values(v_pref.user_id,p_product_id,p_event_type::public.wishlist_alert_type,coalesce(nullif(p_idempotency_key,''),p_product_id::text||':'||p_event_type||':'||date_trunc('hour',now())::text)||':'||v_pref.user_id,p_payload)
    on conflict(idempotency_key) do nothing returning id into v_event;
    if v_event is not null then
      insert into public.wishlist_alert_deliveries(event_id,user_id,channel) values(v_event,v_pref.user_id,'in_app');
      perform public.publish_notification_event('wishlist_'||p_event_type,'product',p_product_id::text,p_payload||jsonb_build_object('user_id',v_pref.user_id,'wishlist_event_id',v_event));
      insert into public.customer_activity(customer_id,activity_type,description,metadata) select id,'wishlist_alert_triggered','Favori alarmı tetiklendi',jsonb_build_object('event_id',v_event,'product_id',p_product_id,'type',p_event_type) from public.customer_profiles where user_id=v_pref.user_id;
      v_count:=v_count+1;
    end if; v_event:=null;
  end loop; return v_count;
end $$;

create or replace function public.complete_wishlist_alert_delivery(p_delivery_id uuid,p_success boolean,p_error text default null)
returns boolean language plpgsql security definer set search_path=public,auth as $$
begin
  if not public.current_user_is_admin() then raise exception 'not_allowed'; end if;
  update public.wishlist_alert_deliveries set status=case when p_success then 'completed'::public.wishlist_alert_status else 'failed'::public.wishlist_alert_status end,attempt_count=attempt_count+1,last_error=case when p_success then null else left(p_error,500) end,delivered_at=case when p_success then now() else delivered_at end,updated_at=now() where id=p_delivery_id;
  return found;
end $$;
create or replace function public.retry_wishlist_alert_delivery(p_event_id uuid) returns boolean language plpgsql security definer set search_path=public,auth as $$
begin if not public.current_user_is_admin() then raise exception 'not_allowed'; end if; update public.wishlist_alert_deliveries set status='pending',last_error=null,updated_at=now() where event_id=p_event_id and status='failed'; perform public.write_audit_log('wishlist_alert_delivery_retried','system',p_event_id::text,'Wishlist alert',null,null,'{}'); return found; end $$;
create or replace function public.cancel_wishlist_alert_event(p_event_id uuid) returns boolean language plpgsql security definer set search_path=public,auth as $$
begin if not public.current_user_is_admin() then raise exception 'not_allowed'; end if; update public.wishlist_alert_events set status='cancelled',cancelled_at=now() where id=p_event_id and status in ('pending','failed'); update public.wishlist_alert_deliveries set status='cancelled',updated_at=now() where event_id=p_event_id and status in ('pending','failed'); perform public.write_audit_log('wishlist_alert_cancelled','system',p_event_id::text,'Wishlist alert',null,null,'{}'); return found; end $$;

create or replace function public.capture_product_price_stock_history() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if old.price is distinct from new.price then
  insert into public.product_price_history(product_id,old_price,new_price,change_percentage) values(new.id,old.price,new.price,round(((new.price-old.price)/nullif(old.price,0))*100,2));
  if new.price<old.price then perform public.create_wishlist_alert_event(new.id,'price_drop',jsonb_build_object('old_price',old.price,'new_price',new.price),'price:'||new.id||':'||new.price); end if;
 end if;
 if old.stock_quantity is distinct from new.stock_quantity then
  insert into public.product_stock_history(product_id,old_stock,new_stock,old_status,new_status) values(new.id,old.stock_quantity,new.stock_quantity,case when old.stock_quantity>0 then 'in_stock' else 'out_of_stock' end,case when new.stock_quantity>0 then 'in_stock' else 'out_of_stock' end);
  if old.stock_quantity<=0 and new.stock_quantity>0 then perform public.create_wishlist_alert_event(new.id,'back_in_stock',jsonb_build_object('stock',new.stock_quantity),'stock:'||new.id||':'||new.stock_quantity); end if;
 end if; return new;
end $$;
create trigger products_wishlist_history after update of price,stock_quantity on public.products for each row execute function public.capture_product_price_stock_history();

create or replace function public.capture_inventory_stock_history() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if old.quantity is distinct from new.quantity then
  insert into public.product_stock_history(product_id,old_stock,new_stock,old_status,new_status,warehouse_id) values(new.product_id,old.quantity,new.quantity,case when old.quantity>0 then 'in_stock' else 'out_of_stock' end,case when new.quantity>0 then 'in_stock' else 'out_of_stock' end,new.warehouse_id);
  if old.quantity<=0 and new.quantity>0 then perform public.create_wishlist_alert_event(new.product_id,'back_in_stock',jsonb_build_object('stock',new.quantity,'warehouse_id',new.warehouse_id),'inventory:'||new.product_id||':'||new.warehouse_id||':'||new.quantity); end if;
 end if; return new;
end $$;
create trigger inventory_wishlist_history after update of quantity on public.inventory for each row execute function public.capture_inventory_stock_history();

create or replace function public.capture_campaign_wishlist_alerts() returns trigger language plpgsql security definer set search_path=public as $$
declare v_product uuid;
begin
 if new.is_active and new.starts_at<=now() and new.ends_at>=now() and (tg_op='INSERT' or old.is_active is distinct from new.is_active or old.starts_at is distinct from new.starts_at) then
  for v_product in select p.id from public.products p where p.is_active and (new.product_id is null or p.id=new.product_id) and (new.category_id is null or p.category_id=new.category_id) and (new.brand_id is null or p.brand_id=new.brand_id) loop
   perform public.create_wishlist_alert_event(v_product,'promotion_started',jsonb_build_object('campaign_id',new.id,'campaign_name',new.name),'campaign:'||new.id||':'||v_product);
  end loop;
 end if; return new;
end $$;
create trigger campaigns_wishlist_alert after insert or update of is_active,starts_at,ends_at on public.campaigns for each row execute function public.capture_campaign_wishlist_alerts();

create or replace function public.get_admin_wishlist_alerts(p_query text default '',p_type text default null,p_status text default null,p_page integer default 1,p_page_size integer default 20)
returns jsonb language sql security definer set search_path=public,auth stable as $$
 select case when public.current_user_is_admin() then jsonb_build_object(
  'rows',coalesce((select jsonb_agg(to_jsonb(x)) from (select e.id,e.event_type,e.status,e.product_id,e.user_id,p.name product_name,u.email user_email,e.created_at,d.status delivery_status from public.wishlist_alert_events e join public.products p on p.id=e.product_id left join auth.users u on u.id=e.user_id left join public.wishlist_alert_deliveries d on d.event_id=e.id where (p_type is null or e.event_type::text=p_type) and (p_status is null or coalesce(d.status,e.status)::text=p_status) and (p_query='' or p.name ilike '%'||p_query||'%' or coalesce(u.email,'') ilike '%'||p_query||'%') order by e.created_at desc limit greatest(1,least(p_page_size,100)) offset (greatest(p_page,1)-1)*greatest(1,least(p_page_size,100))) x),'[]'::jsonb),
  'total',(select count(*) from public.wishlist_alert_events),
  'metrics',jsonb_build_object('totalPreferences',(select count(*) from public.wishlist_alert_preferences),'priceAlerts',(select count(*) from public.wishlist_alert_preferences where price_drop),'stockAlerts',(select count(*) from public.wishlist_alert_preferences where back_in_stock),'promotionAlerts',(select count(*) from public.wishlist_alert_preferences where promotion_started),'events',(select count(*) from public.wishlist_alert_events),'pending',(select count(*) from public.wishlist_alert_deliveries where status='pending'),'completed',(select count(*) from public.wishlist_alert_deliveries where status='completed'),'failed',(select count(*) from public.wishlist_alert_deliveries where status='failed'))
 ) else null end
$$;

revoke all on function public.set_wishlist_alert_preference(uuid,boolean,boolean,boolean) from public; grant execute on function public.set_wishlist_alert_preference(uuid,boolean,boolean,boolean) to authenticated;
revoke all on function public.create_wishlist_alert_event(uuid,text,jsonb,text) from public; grant execute on function public.create_wishlist_alert_event(uuid,text,jsonb,text) to authenticated;
revoke all on function public.complete_wishlist_alert_delivery(uuid,boolean,text),public.retry_wishlist_alert_delivery(uuid),public.cancel_wishlist_alert_event(uuid),public.get_admin_wishlist_alerts(text,text,text,integer,integer) from public;
grant execute on function public.complete_wishlist_alert_delivery(uuid,boolean,text),public.retry_wishlist_alert_delivery(uuid),public.cancel_wishlist_alert_event(uuid),public.get_admin_wishlist_alerts(text,text,text,integer,integer) to authenticated;
