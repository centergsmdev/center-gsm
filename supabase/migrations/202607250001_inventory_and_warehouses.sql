begin;

create table public.warehouses (
  id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name))>0), code text not null unique check(code=upper(code)),
  description text, address text, is_default boolean not null default false, is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc',now()), updated_at timestamptz not null default timezone('utc',now())
);
create unique index warehouses_one_active_default_idx on public.warehouses(is_default) where is_default and is_active;

create table public.inventory (
  id uuid primary key default gen_random_uuid(), warehouse_id uuid not null references public.warehouses(id) on update cascade on delete restrict,
  product_id uuid not null references public.products(id) on update cascade on delete restrict,
  quantity_on_hand integer not null default 0 check(quantity_on_hand>=0), quantity_reserved integer not null default 0 check(quantity_reserved>=0 and quantity_reserved<=quantity_on_hand),
  reorder_level integer not null default 5 check(reorder_level>=0), created_at timestamptz not null default timezone('utc',now()), updated_at timestamptz not null default timezone('utc',now()),
  unique(warehouse_id,product_id)
);
create index inventory_product_idx on public.inventory(product_id); create index inventory_warehouse_idx on public.inventory(warehouse_id);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(), warehouse_id uuid not null references public.warehouses(id) on update cascade on delete restrict,
  product_id uuid not null references public.products(id) on update cascade on delete restrict,
  movement_type text not null check(movement_type in ('initial_stock','manual_increase','manual_decrease','order_reservation','order_sale','reservation_release','order_cancel_return','customer_return','stock_correction')),
  quantity integer not null check(quantity<>0), quantity_before integer not null check(quantity_before>=0), quantity_after integer not null check(quantity_after>=0),
  order_id uuid references public.orders(id) on update cascade on delete set null, reference text, note text not null, created_by uuid references auth.users(id) on update cascade on delete set null,
  created_at timestamptz not null default timezone('utc',now())
);
create index inventory_movements_product_date_idx on public.inventory_movements(product_id,created_at desc);
create index inventory_movements_warehouse_date_idx on public.inventory_movements(warehouse_id,created_at desc);
create index inventory_movements_order_idx on public.inventory_movements(order_id) where order_id is not null;

create table public.inventory_reservations (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on update cascade on delete cascade,
  order_item_id uuid not null unique references public.order_items(id) on update cascade on delete cascade,
  warehouse_id uuid not null references public.warehouses(id) on update cascade on delete restrict,
  product_id uuid not null references public.products(id) on update cascade on delete restrict,
  quantity integer not null check(quantity>0), status text not null default 'active' check(status in ('active','completed','released','expired')),
  expires_at timestamptz not null default (timezone('utc',now())+interval '30 minutes'), created_at timestamptz not null default timezone('utc',now()),
  released_at timestamptz, completed_at timestamptz, updated_at timestamptz not null default timezone('utc',now())
);
create index inventory_reservations_order_idx on public.inventory_reservations(order_id,status);
create index inventory_reservations_expiry_idx on public.inventory_reservations(expires_at) where status='active';

create trigger set_warehouses_updated_at before update on public.warehouses for each row execute function public.set_updated_at();
create trigger set_inventory_updated_at before update on public.inventory for each row execute function public.set_updated_at();
create trigger set_inventory_reservations_updated_at before update on public.inventory_reservations for each row execute function public.set_updated_at();

insert into public.warehouses(id,name,code,description,is_default,is_active)
select '30000000-0000-4000-8000-000000000001','CENTER GSM Ana Depo','MAIN','Sistem tarafından oluşturulan varsayılan depo',true,true
where not exists(select 1 from public.warehouses where code='MAIN');
update public.warehouses set is_default=true where id=(select id from public.warehouses where is_active order by is_default desc,created_at limit 1)
  and not exists(select 1 from public.warehouses where is_active and is_default);

insert into public.inventory(warehouse_id,product_id,quantity_on_hand,quantity_reserved,reorder_level)
select w.id,p.id,greatest(0,p.stock_quantity),0,5 from public.products p cross join lateral(select id from public.warehouses where is_active order by is_default desc,created_at limit 1) w
on conflict(warehouse_id,product_id) do nothing;
insert into public.inventory_movements(warehouse_id,product_id,movement_type,quantity,quantity_before,quantity_after,reference,note)
select i.warehouse_id,i.product_id,'initial_stock',i.quantity_on_hand,0,i.quantity_on_hand,'MIGRATION-202607250001','Mevcut ürün stoğu varsayılan depoya taşındı'
from public.inventory i where i.quantity_on_hand>0 and not exists(select 1 from public.inventory_movements m where m.warehouse_id=i.warehouse_id and m.product_id=i.product_id and m.movement_type='initial_stock');

create or replace view public.product_available_stock as
select p.id as product_id,coalesce(sum(i.quantity_on_hand-i.quantity_reserved),0)::integer as available_stock
from public.products p left join public.inventory i on i.product_id=p.id left join public.warehouses w on w.id=i.warehouse_id and w.is_active
where p.is_active group by p.id;

alter table public.warehouses enable row level security; alter table public.inventory enable row level security;
alter table public.inventory_movements enable row level security; alter table public.inventory_reservations enable row level security;
create policy "Admins manage warehouses" on public.warehouses for all to authenticated using((select public.is_admin())) with check((select public.is_admin()));
create policy "Admins read inventory" on public.inventory for select to authenticated using((select public.is_admin()));
create policy "Admins read inventory movements" on public.inventory_movements for select to authenticated using((select public.is_admin()));
create policy "Admins read reservations" on public.inventory_reservations for select to authenticated using((select public.is_admin()));
create policy "Users read own reservations" on public.inventory_reservations for select to authenticated using(exists(select 1 from public.orders o where o.id=order_id and o.user_id=(select auth.uid())));
revoke all on public.warehouses,public.inventory,public.inventory_movements,public.inventory_reservations from anon,authenticated;
grant select,insert,update,delete on public.warehouses to authenticated; grant select on public.inventory,public.inventory_movements,public.inventory_reservations to authenticated;
grant select on public.product_available_stock to anon,authenticated;

create or replace function public.sync_product_stock_from_inventory() returns trigger language plpgsql security definer set search_path='' as $$
begin update public.products set stock_quantity=coalesce((select sum(i.quantity_on_hand-i.quantity_reserved) from public.inventory i join public.warehouses w on w.id=i.warehouse_id where i.product_id=case when tg_op='DELETE' then old.product_id else new.product_id end and w.is_active),0) where id=case when tg_op='DELETE' then old.product_id else new.product_id end; if tg_op='DELETE' then return old; end if; return new; end; $$;
create trigger sync_product_stock_after_inventory after insert or update or delete on public.inventory for each row execute function public.sync_product_stock_from_inventory();

create or replace function public.protect_direct_product_stock_update() returns trigger language plpgsql set search_path='' as $$
begin if new.stock_quantity<>old.stock_quantity and pg_trigger_depth()=1 then raise exception 'direct_stock_update_forbidden'; end if; return new; end; $$;
create trigger protect_product_stock before update of stock_quantity on public.products for each row execute function public.protect_direct_product_stock_update();

create or replace function public.initialize_product_inventory() returns trigger language plpgsql security definer set search_path='' as $$
declare v_warehouse uuid; v_quantity integer:=greatest(0,new.stock_quantity);
begin select id into v_warehouse from public.warehouses where is_active order by is_default desc,created_at limit 1; if v_warehouse is null then raise exception 'warehouse_unavailable'; end if;
insert into public.inventory(warehouse_id,product_id,quantity_on_hand) values(v_warehouse,new.id,v_quantity);
if v_quantity>0 then insert into public.inventory_movements(warehouse_id,product_id,movement_type,quantity,quantity_before,quantity_after,reference,note,created_by) values(v_warehouse,new.id,'initial_stock',v_quantity,0,v_quantity,'PRODUCT-CREATE','Yeni ürün başlangıç stoğu',auth.uid()); end if; return new; end; $$;
create trigger initialize_product_inventory_after_insert after insert on public.products for each row execute function public.initialize_product_inventory();

create or replace function public.reserve_order_item_inventory() returns trigger language plpgsql security definer set search_path='' as $$
declare v_inventory public.inventory%rowtype; v_before integer;
begin select i.* into v_inventory from public.inventory i join public.warehouses w on w.id=i.warehouse_id where i.product_id=new.product_id and w.is_active order by w.is_default desc,(i.quantity_on_hand-i.quantity_reserved) desc for update of i limit 1;
if not found or v_inventory.quantity_on_hand-v_inventory.quantity_reserved<new.quantity then raise exception 'insufficient_inventory'; end if;
v_before:=v_inventory.quantity_on_hand-v_inventory.quantity_reserved; update public.inventory set quantity_reserved=quantity_reserved+new.quantity where id=v_inventory.id;
insert into public.inventory_reservations(order_id,order_item_id,warehouse_id,product_id,quantity) values(new.order_id,new.id,v_inventory.warehouse_id,new.product_id,new.quantity);
insert into public.inventory_movements(warehouse_id,product_id,movement_type,quantity,quantity_before,quantity_after,order_id,reference,note) values(v_inventory.warehouse_id,new.product_id,'order_reservation',-new.quantity,v_before,v_before-new.quantity,new.order_id,'ORDER-'||new.order_id,'Sipariş için stok rezerve edildi'); return new; end; $$;
create trigger reserve_inventory_after_order_item after insert on public.order_items for each row when(new.product_id is not null) execute function public.reserve_order_item_inventory();

create or replace function public.complete_order_inventory(p_order_id uuid) returns boolean language plpgsql security definer set search_path='' as $$
declare r public.inventory_reservations%rowtype; i public.inventory%rowtype;
begin for r in select * from public.inventory_reservations where order_id=p_order_id and status='active' order by id for update loop select * into i from public.inventory where warehouse_id=r.warehouse_id and product_id=r.product_id for update; if i.quantity_reserved<r.quantity or i.quantity_on_hand<r.quantity then raise exception 'inventory_inconsistent'; end if;
update public.inventory set quantity_on_hand=quantity_on_hand-r.quantity,quantity_reserved=quantity_reserved-r.quantity where id=i.id;
update public.inventory_reservations set status='completed',completed_at=timezone('utc',now()) where id=r.id;
insert into public.inventory_movements(warehouse_id,product_id,movement_type,quantity,quantity_before,quantity_after,order_id,reference,note,created_by) values(r.warehouse_id,r.product_id,'order_sale',-r.quantity,i.quantity_on_hand,i.quantity_on_hand-r.quantity,p_order_id,'ORDER-'||p_order_id,'Sipariş satışı stoktan düşüldü',auth.uid()); end loop; return true; end; $$;

create or replace function public.release_order_inventory(p_order_id uuid,p_restore_completed boolean,p_customer_return boolean default false) returns boolean language plpgsql security definer set search_path='' as $$
declare r public.inventory_reservations%rowtype; i public.inventory%rowtype;
begin for r in select * from public.inventory_reservations where order_id=p_order_id and (status='active' or (status='completed' and p_restore_completed)) order by id for update loop select * into i from public.inventory where warehouse_id=r.warehouse_id and product_id=r.product_id for update;
if r.status='active' then update public.inventory set quantity_reserved=quantity_reserved-r.quantity where id=i.id; update public.inventory_reservations set status='released',released_at=timezone('utc',now()) where id=r.id;
insert into public.inventory_movements(warehouse_id,product_id,movement_type,quantity,quantity_before,quantity_after,order_id,reference,note,created_by) values(r.warehouse_id,r.product_id,'reservation_release',r.quantity,i.quantity_on_hand-i.quantity_reserved,i.quantity_on_hand-i.quantity_reserved+r.quantity,p_order_id,'ORDER-'||p_order_id,'Sipariş rezervasyonu serbest bırakıldı',auth.uid());
else update public.inventory set quantity_on_hand=quantity_on_hand+r.quantity where id=i.id; update public.inventory_reservations set status='released',released_at=timezone('utc',now()) where id=r.id;
insert into public.inventory_movements(warehouse_id,product_id,movement_type,quantity,quantity_before,quantity_after,order_id,reference,note,created_by) values(r.warehouse_id,r.product_id,case when p_customer_return then 'customer_return' else 'order_cancel_return' end,r.quantity,i.quantity_on_hand,i.quantity_on_hand+r.quantity,p_order_id,'ORDER-'||p_order_id,case when p_customer_return then 'Müşteri iadesi stoğa eklendi' else 'İptal edilen sipariş stoğa geri eklendi' end,auth.uid()); end if; end loop; return true; end; $$;

create or replace function public.adjust_inventory(p_warehouse_id uuid,p_product_id uuid,p_movement_type text,p_quantity integer,p_note text) returns boolean language plpgsql security definer set search_path='' as $$
declare i public.inventory%rowtype; v_after integer;
begin if not public.is_admin() then raise exception 'forbidden'; end if; if p_movement_type not in('manual_increase','manual_decrease','stock_correction') or p_quantity=0 or length(trim(p_note))<3 then raise exception 'invalid_adjustment'; end if;
select * into i from public.inventory where warehouse_id=p_warehouse_id and product_id=p_product_id for update; if not found then insert into public.inventory(warehouse_id,product_id) values(p_warehouse_id,p_product_id) returning * into i; end if;
v_after:=case when p_movement_type='stock_correction' then p_quantity else i.quantity_on_hand+case when p_movement_type='manual_increase' then abs(p_quantity) else -abs(p_quantity) end end;
if v_after<i.quantity_reserved or v_after<0 then raise exception 'negative_available_stock'; end if; update public.inventory set quantity_on_hand=v_after where id=i.id;
insert into public.inventory_movements(warehouse_id,product_id,movement_type,quantity,quantity_before,quantity_after,reference,note,created_by) values(p_warehouse_id,p_product_id,p_movement_type,v_after-i.quantity_on_hand,i.quantity_on_hand,v_after,'ADMIN-'||gen_random_uuid(),trim(p_note),auth.uid()); return true; end; $$;

create or replace function public.set_inventory_reorder_level(p_warehouse_id uuid,p_product_id uuid,p_reorder_level integer) returns boolean language plpgsql security definer set search_path='' as $$ begin if not public.is_admin() then raise exception 'forbidden'; end if; if p_reorder_level<0 then raise exception 'invalid_reorder_level'; end if; update public.inventory set reorder_level=p_reorder_level where warehouse_id=p_warehouse_id and product_id=p_product_id; return found; end; $$;
create or replace function public.set_default_warehouse(p_warehouse_id uuid) returns boolean language plpgsql security definer set search_path='' as $$ begin if not public.is_admin() then raise exception 'forbidden'; end if; if not exists(select 1 from public.warehouses where id=p_warehouse_id and is_active) then return false; end if; update public.warehouses set is_default=false where is_default; update public.warehouses set is_default=true where id=p_warehouse_id; return true; end; $$;

drop function if exists public.admin_update_order(uuid,text,text,text);
drop function if exists public.admin_update_order(uuid,text,text,text,boolean);
create function public.admin_update_order(p_order_id uuid,p_status text,p_payment_status text,p_note text,p_restore_stock boolean default false) returns boolean language plpgsql security definer set search_path='' as $$
declare v_history jsonb;v_current text;v_current_payment text;
begin if not public.is_admin() then raise exception 'forbidden'; end if; if p_status not in('received','preparing','shipped','delivered','cancelled') then raise exception 'invalid_status'; end if; if p_payment_status not in('pending','awaiting_payment','paid','failed','cancelled','refunded') then raise exception 'invalid_payment_status'; end if;
select status,payment_status,status_history into v_current,v_current_payment,v_history from public.orders where id=p_order_id for update; if not found then return false; end if;
if p_status='preparing' or p_payment_status='paid' then perform public.complete_order_inventory(p_order_id); end if; if p_status='cancelled' then perform public.release_order_inventory(p_order_id,p_restore_stock,false); end if; if p_payment_status='refunded' and p_restore_stock then perform public.release_order_inventory(p_order_id,true,true); end if;
if v_current<>p_status then v_history:=coalesce(v_history,'[]'::jsonb)||jsonb_build_array(jsonb_build_object('status',p_status,'label',case p_status when'received'then'Sipariş alındı'when'preparing'then'Hazırlanıyor'when'shipped'then'Kargoya verildi'when'delivered'then'Teslim edildi'else'İptal edildi'end,'at',timezone('utc',now())));end if;
if v_current_payment<>p_payment_status then v_history:=coalesce(v_history,'[]'::jsonb)||jsonb_build_array(jsonb_build_object('status','payment:'||p_payment_status,'label','Ödeme durumu: '||p_payment_status,'at',timezone('utc',now())));end if;
update public.orders set status=p_status,payment_status=p_payment_status,admin_note=nullif(trim(p_note),''),status_history=v_history where id=p_order_id; update public.payment_transactions set status=p_payment_status,note=coalesce(nullif(trim(p_note),''),note) where order_id=p_order_id and transaction_type='payment'; return true; end; $$;

revoke all on function public.complete_order_inventory(uuid),public.release_order_inventory(uuid,boolean,boolean),public.adjust_inventory(uuid,uuid,text,integer,text),public.set_inventory_reorder_level(uuid,uuid,integer),public.set_default_warehouse(uuid),public.admin_update_order(uuid,text,text,text,boolean) from public;
grant execute on function public.adjust_inventory(uuid,uuid,text,integer,text),public.set_inventory_reorder_level(uuid,uuid,integer),public.set_default_warehouse(uuid),public.admin_update_order(uuid,text,text,text,boolean) to authenticated;

commit;
