begin;

alter table public.coupons add column if not exists title text;
alter table public.coupons add column if not exists priority integer not null default 100 check(priority between 0 and 10000);
alter table public.coupons add column if not exists is_stackable boolean not null default false;
alter table public.coupons drop constraint if exists coupons_discount_type_check;
alter table public.coupons add constraint coupons_discount_type_check check(discount_type in ('percentage','fixed','free_shipping'));
alter table public.coupons drop constraint if exists coupons_discount_value_check;
alter table public.coupons add constraint coupons_discount_value_check check((discount_type='free_shipping' and discount_value=0) or (discount_type<>'free_shipping' and discount_value>0));
update public.coupons set title=coalesce(title,description,code) where title is null;
alter table public.coupons alter column title set not null;

create table if not exists public.coupon_redemptions(
 id uuid primary key default gen_random_uuid(),coupon_id uuid not null references public.coupons(id) on delete restrict,user_id uuid references auth.users(id) on delete set null,
 order_id uuid references public.orders(id) on delete cascade,reservation_token uuid not null default gen_random_uuid(),status text not null default 'reserved' check(status in('reserved','redeemed','released','cancelled')),
 discount_amount numeric(12,2) not null default 0 check(discount_amount>=0),reserved_at timestamptz not null default timezone('utc',now()),redeemed_at timestamptz,released_at timestamptz,
 created_at timestamptz not null default timezone('utc',now()),updated_at timestamptz not null default timezone('utc',now()),unique(reservation_token),unique(order_id)
);
create table if not exists public.promotion_rules(
 id uuid primary key default gen_random_uuid(),coupon_id uuid not null references public.coupons(id) on delete cascade,name text not null,target_type text not null check(target_type in('all','category','brand','product','user','customer_segment','first_order')),
 target_id text,is_active boolean not null default true,priority integer not null default 100,created_at timestamptz not null default timezone('utc',now()),updated_at timestamptz not null default timezone('utc',now())
);
create table if not exists public.promotion_conditions(
 id uuid primary key default gen_random_uuid(),rule_id uuid not null references public.promotion_rules(id) on delete cascade,condition_type text not null check(condition_type in('minimum_amount','category','brand','product','user','customer_segment','first_order')),
 operator text not null default 'equals' check(operator in('equals','in','gte','lte')),configuration jsonb not null default '{}'::jsonb,created_at timestamptz not null default timezone('utc',now()),updated_at timestamptz not null default timezone('utc',now())
);
create table if not exists public.promotion_usage_logs(
 id uuid primary key default gen_random_uuid(),coupon_id uuid references public.coupons(id) on delete set null,order_id uuid references public.orders(id) on delete set null,user_id uuid references auth.users(id) on delete set null,
 event_type text not null check(event_type in('validated','validation_failed','reserved','redeemed','released','expired','applied','removed')),discount_amount numeric(12,2) not null default 0,
 metadata jsonb not null default '{}'::jsonb,created_at timestamptz not null default timezone('utc',now())
);

alter table public.orders add column if not exists coupon_code text;
alter table public.orders add column if not exists coupon_name text;
alter table public.orders add column if not exists coupon_type text;
alter table public.orders add column if not exists coupon_discount_amount numeric(12,2) not null default 0;
alter table public.orders add column if not exists coupon_discount_percentage numeric(7,2);
alter table public.orders add column if not exists free_shipping boolean not null default false;
alter table public.orders add column if not exists promotion_snapshot jsonb not null default '{}'::jsonb;

create index if not exists coupons_engine_lookup_idx on public.coupons(code,is_active,starts_at,ends_at,priority);
create index if not exists coupon_redemptions_usage_idx on public.coupon_redemptions(coupon_id,status,user_id);
create index if not exists promotion_rules_coupon_idx on public.promotion_rules(coupon_id,is_active,priority);
create index if not exists promotion_conditions_rule_idx on public.promotion_conditions(rule_id,condition_type);
create index if not exists promotion_usage_logs_coupon_idx on public.promotion_usage_logs(coupon_id,created_at desc);

alter table public.coupon_redemptions enable row level security;alter table public.promotion_rules enable row level security;alter table public.promotion_conditions enable row level security;alter table public.promotion_usage_logs enable row level security;
revoke all on public.coupon_redemptions,public.promotion_rules,public.promotion_conditions,public.promotion_usage_logs from anon,authenticated;
grant select on public.coupon_redemptions,public.promotion_rules,public.promotion_conditions,public.promotion_usage_logs to authenticated;
create policy "Admins read coupon redemptions" on public.coupon_redemptions for select to authenticated using(public.is_admin());
create policy "Users read own coupon redemptions" on public.coupon_redemptions for select to authenticated using(user_id=auth.uid());
create policy "Admins read promotion rules" on public.promotion_rules for select to authenticated using(public.is_admin());
create policy "Admins read promotion conditions" on public.promotion_conditions for select to authenticated using(public.is_admin());
create policy "Admins read promotion logs" on public.promotion_usage_logs for select to authenticated using(public.is_admin());

create or replace function public.admin_create_coupon(p_coupon jsonb) returns uuid language plpgsql security definer set search_path='' as $$declare v_id uuid;begin if not public.is_admin() then raise exception 'admin_required';end if;
insert into public.coupons(code,title,description,discount_type,discount_value,minimum_order_amount,maximum_discount_amount,usage_limit,usage_limit_per_user,starts_at,ends_at,is_active,priority,is_stackable)
values(upper(trim(p_coupon->>'code')),trim(coalesce(p_coupon->>'title',p_coupon->>'code')),nullif(trim(p_coupon->>'description'),''),p_coupon->>'discount_type',coalesce((p_coupon->>'discount_value')::numeric,0),coalesce((p_coupon->>'minimum_order_amount')::numeric,0),nullif(p_coupon->>'maximum_discount_amount','')::numeric,nullif(p_coupon->>'usage_limit','')::integer,nullif(p_coupon->>'usage_limit_per_user','')::integer,(p_coupon->>'starts_at')::timestamptz,(p_coupon->>'ends_at')::timestamptz,coalesce((p_coupon->>'is_active')::boolean,true),coalesce((p_coupon->>'priority')::integer,100),coalesce((p_coupon->>'is_stackable')::boolean,false)) returning id into v_id;
perform public.write_audit_log('coupon_created','coupon',v_id::text,p_coupon->>'code',null,p_coupon,'{}');insert into public.notification_events(event_type,entity_type,entity_id,payload,status)values('coupon_created','coupon',v_id::text,jsonb_build_object('code',upper(trim(p_coupon->>'code'))),'pending');return v_id;end$$;
create or replace function public.admin_update_coupon(p_coupon_id uuid,p_coupon jsonb) returns boolean language plpgsql security definer set search_path='' as $$declare v_old jsonb;begin if not public.is_admin() then raise exception 'admin_required';end if;select to_jsonb(c) into v_old from public.coupons c where id=p_coupon_id for update;if v_old is null then return false;end if;
update public.coupons set code=upper(trim(p_coupon->>'code')),title=trim(coalesce(p_coupon->>'title',p_coupon->>'code')),description=nullif(trim(p_coupon->>'description'),''),discount_type=p_coupon->>'discount_type',discount_value=coalesce((p_coupon->>'discount_value')::numeric,0),minimum_order_amount=coalesce((p_coupon->>'minimum_order_amount')::numeric,0),maximum_discount_amount=nullif(p_coupon->>'maximum_discount_amount','')::numeric,usage_limit=nullif(p_coupon->>'usage_limit','')::integer,usage_limit_per_user=nullif(p_coupon->>'usage_limit_per_user','')::integer,starts_at=(p_coupon->>'starts_at')::timestamptz,ends_at=(p_coupon->>'ends_at')::timestamptz,is_active=coalesce((p_coupon->>'is_active')::boolean,true),priority=coalesce((p_coupon->>'priority')::integer,100),is_stackable=coalesce((p_coupon->>'is_stackable')::boolean,false) where id=p_coupon_id;
perform public.write_audit_log('coupon_updated','coupon',p_coupon_id::text,p_coupon->>'code',v_old,p_coupon,'{}');return true;end$$;
create or replace function public.admin_delete_coupon(p_coupon_id uuid) returns boolean language plpgsql security definer set search_path='' as $$begin if not public.is_admin() then raise exception 'admin_required';end if;update public.coupons set is_active=false where id=p_coupon_id;perform public.write_audit_log('coupon_deleted','coupon',p_coupon_id::text,'Coupon',null,jsonb_build_object('is_active',false),'{}');return found;end$$;

create or replace function public.validate_coupon(p_code text,p_items jsonb) returns jsonb language plpgsql security definer set search_path='' as $$declare v_coupon public.coupons%rowtype;v_result jsonb;v_rules int;v_match int;begin
select * into v_coupon from public.coupons where code=upper(trim(p_code));if not found or not v_coupon.is_active or v_coupon.starts_at>timezone('utc',now()) or v_coupon.ends_at<timezone('utc',now()) then insert into public.promotion_usage_logs(coupon_id,user_id,event_type,metadata)values(v_coupon.id,auth.uid(),'validation_failed',jsonb_build_object('reason','invalid'));return jsonb_build_object('valid',false,'error','coupon_invalid');end if;
select count(*) into v_rules from public.promotion_rules where coupon_id=v_coupon.id and is_active;if v_rules>0 then select count(*) into v_match from public.promotion_rules r where r.coupon_id=v_coupon.id and r.is_active and (r.target_type='all' or(r.target_type='user' and r.target_id=auth.uid()::text)or(r.target_type='first_order' and auth.uid() is not null and not exists(select 1 from public.orders where user_id=auth.uid()))or(r.target_type='category' and exists(select 1 from jsonb_array_elements(p_items)i join public.products p on p.sku=i->>'sku' where p.category_id::text=r.target_id))or(r.target_type='brand' and exists(select 1 from jsonb_array_elements(p_items)i join public.products p on p.sku=i->>'sku' where p.brand_id::text=r.target_id))or(r.target_type='product' and exists(select 1 from jsonb_array_elements(p_items)i join public.products p on p.sku=i->>'sku' where p.id::text=r.target_id))or(r.target_type='customer_segment' and exists(select 1 from public.customer_profiles cp where cp.user_id=auth.uid() and cp.segment=r.target_id)));if v_match=0 then insert into public.promotion_usage_logs(coupon_id,user_id,event_type,metadata)values(v_coupon.id,auth.uid(),'validation_failed',jsonb_build_object('reason','rules'));return jsonb_build_object('valid',false,'error','coupon_not_applicable');end if;end if;
v_result:=public.compute_order_pricing(p_items,v_coupon.code,false);insert into public.promotion_usage_logs(coupon_id,user_id,event_type,discount_amount)values(v_coupon.id,auth.uid(),'validated',coalesce((v_result->>'coupon_discount')::numeric,0));return v_result||jsonb_build_object('valid',true,'free_shipping',v_coupon.discount_type='free_shipping');exception when others then return jsonb_build_object('valid',false,'error','coupon_invalid');end$$;

create or replace function public.redeem_coupon(p_coupon_id uuid,p_order_id uuid,p_discount numeric) returns uuid language plpgsql security definer set search_path='' as $$declare v_coupon public.coupons%rowtype;v_id uuid;v_total int;v_user int;begin select * into v_coupon from public.coupons where id=p_coupon_id for update;if not found or not v_coupon.is_active then raise exception 'coupon_invalid';end if;select count(*) into v_total from public.coupon_redemptions where coupon_id=p_coupon_id and status in('reserved','redeemed');if v_coupon.usage_limit is not null and v_total>=v_coupon.usage_limit then raise exception 'coupon_limit';end if;select count(*) into v_user from public.coupon_redemptions where coupon_id=p_coupon_id and user_id=auth.uid() and status in('reserved','redeemed');if v_coupon.usage_limit_per_user is not null and v_user>=v_coupon.usage_limit_per_user then raise exception 'coupon_user_limit';end if;insert into public.coupon_redemptions(coupon_id,user_id,order_id,status,discount_amount,redeemed_at)values(p_coupon_id,auth.uid(),p_order_id,'redeemed',greatest(0,p_discount),timezone('utc',now()))returning id into v_id;insert into public.promotion_usage_logs(coupon_id,order_id,user_id,event_type,discount_amount)values(p_coupon_id,p_order_id,auth.uid(),'redeemed',greatest(0,p_discount));return v_id;end$$;
create or replace function public.release_coupon(p_order_id uuid) returns boolean language plpgsql security definer set search_path='' as $$
declare v_allowed boolean; v_updated boolean;
begin
  v_allowed := public.current_user_is_admin() or exists(
    select 1 from public.orders o where o.id=p_order_id and o.user_id=auth.uid()
  );
  if not v_allowed then raise exception 'forbidden'; end if;
  update public.coupon_redemptions set status='released',released_at=timezone('utc',now()) where order_id=p_order_id and status in('reserved','redeemed');
  v_updated := found;
  insert into public.promotion_usage_logs(coupon_id,order_id,user_id,event_type,discount_amount)
  select coupon_id,order_id,user_id,'released',discount_amount from public.coupon_redemptions where order_id=p_order_id;
  perform public.write_audit_log('coupon_released','coupon',p_order_id::text,'Coupon redemption',null,null,'{}');
  return v_updated;
end$$;

create or replace function public.sync_coupon_order_snapshot() returns trigger language plpgsql security definer set search_path='' as $$declare v_coupon public.coupons%rowtype;v_amount numeric;begin select * into v_coupon from public.coupons where id=new.coupon_id;select coalesce((coupon_snapshot->>'amount')::numeric,0) into v_amount from public.orders where id=new.order_id;update public.orders set coupon_code=v_coupon.code,coupon_name=v_coupon.title,coupon_type=v_coupon.discount_type,coupon_discount_amount=v_amount,coupon_discount_percentage=case when v_coupon.discount_type='percentage' then v_coupon.discount_value end,free_shipping=v_coupon.discount_type='free_shipping',promotion_snapshot=jsonb_build_object('coupon',coupon_snapshot,'campaigns',campaign_snapshots) where id=new.order_id;perform public.redeem_coupon(new.coupon_id,new.order_id,v_amount);insert into public.analytics_events(event_name,entity_type,entity_id,user_id,payload)values('coupon_applied','coupon',new.order_id::text,new.user_id,jsonb_build_object('code',v_coupon.code,'amount',v_amount))on conflict do nothing;insert into public.customer_activity(customer_id,activity_type,description,metadata)select cp.id,'coupon_used','Kupon kullanıldı',jsonb_build_object('code',v_coupon.code,'order_id',new.order_id) from public.customer_profiles cp where cp.user_id=new.user_id;return new;end$$;
drop trigger if exists coupon_usage_engine_sync on public.coupon_usages;create trigger coupon_usage_engine_sync after insert on public.coupon_usages for each row execute function public.sync_coupon_order_snapshot();

revoke all on function public.admin_create_coupon(jsonb),public.admin_update_coupon(uuid,jsonb),public.admin_delete_coupon(uuid) from public,anon;grant execute on function public.admin_create_coupon(jsonb),public.admin_update_coupon(uuid,jsonb),public.admin_delete_coupon(uuid) to authenticated;
revoke all on function public.validate_coupon(text,jsonb),public.redeem_coupon(uuid,uuid,numeric),public.release_coupon(uuid) from public;grant execute on function public.validate_coupon(text,jsonb) to anon,authenticated;grant execute on function public.release_coupon(uuid) to authenticated;
commit;
