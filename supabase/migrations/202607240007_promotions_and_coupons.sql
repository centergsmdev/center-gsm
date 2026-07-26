begin;

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  slug text not null unique check (slug = lower(slug)),
  description text,
  discount_type text not null check (discount_type in ('percentage','fixed')),
  discount_value numeric(12,2) not null check (discount_value > 0),
  minimum_order_amount numeric(12,2) not null default 0 check (minimum_order_amount >= 0),
  maximum_discount_amount numeric(12,2) check (maximum_discount_amount is null or maximum_discount_amount > 0),
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  is_active boolean not null default true,
  category_id uuid references public.categories(id) on update cascade on delete restrict,
  brand_id uuid references public.brands(id) on update cascade on delete restrict,
  product_id uuid references public.products(id) on update cascade on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (discount_type <> 'percentage' or discount_value <= 100),
  check (num_nonnulls(category_id, brand_id, product_id) <= 1)
);

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(code) and length(trim(code)) > 0),
  description text,
  discount_type text not null check (discount_type in ('percentage','fixed')),
  discount_value numeric(12,2) not null check (discount_value > 0),
  minimum_order_amount numeric(12,2) not null default 0 check (minimum_order_amount >= 0),
  maximum_discount_amount numeric(12,2) check (maximum_discount_amount is null or maximum_discount_amount > 0),
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  usage_limit_per_user integer check (usage_limit_per_user is null or usage_limit_per_user > 0),
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (discount_type <> 'percentage' or discount_value <= 100)
);

create table public.coupon_usages (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on update cascade on delete restrict,
  user_id uuid references auth.users(id) on update cascade on delete set null,
  order_id uuid not null unique references public.orders(id) on update cascade on delete cascade,
  used_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.orders add column if not exists coupon_snapshot jsonb;
alter table public.orders add column if not exists campaign_snapshots jsonb not null default '[]'::jsonb;

create index campaigns_active_dates_idx on public.campaigns(is_active, starts_at, ends_at);
create index campaigns_category_idx on public.campaigns(category_id) where category_id is not null;
create index campaigns_brand_idx on public.campaigns(brand_id) where brand_id is not null;
create index campaigns_product_idx on public.campaigns(product_id) where product_id is not null;
create index coupons_active_dates_idx on public.coupons(is_active, starts_at, ends_at);
create index coupon_usages_coupon_idx on public.coupon_usages(coupon_id);
create index coupon_usages_user_idx on public.coupon_usages(user_id) where user_id is not null;

create trigger set_campaigns_updated_at before update on public.campaigns for each row execute function public.set_updated_at();
create trigger set_coupons_updated_at before update on public.coupons for each row execute function public.set_updated_at();
create trigger set_coupon_usages_updated_at before update on public.coupon_usages for each row execute function public.set_updated_at();

alter table public.campaigns enable row level security;
alter table public.coupons enable row level security;
alter table public.coupon_usages enable row level security;

create policy "Public can read active campaigns" on public.campaigns for select to anon, authenticated
  using (is_active and starts_at <= timezone('utc', now()) and ends_at >= timezone('utc', now()));
create policy "Admins can read all campaigns" on public.campaigns for select to authenticated using ((select public.is_admin()));
create policy "Admins can create campaigns" on public.campaigns for insert to authenticated with check ((select public.is_admin()));
create policy "Admins can update campaigns" on public.campaigns for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins can delete campaigns" on public.campaigns for delete to authenticated using ((select public.is_admin()));
create policy "Admins can manage coupons" on public.coupons for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Users can read own coupon usages" on public.coupon_usages for select to authenticated using ((select auth.uid()) = user_id);
create policy "Admins can read coupon usages" on public.coupon_usages for select to authenticated using ((select public.is_admin()));

revoke all on public.campaigns, public.coupons, public.coupon_usages from anon, authenticated;
grant select on public.campaigns to anon, authenticated;
grant select, insert, update, delete on public.campaigns, public.coupons to authenticated;
grant select on public.coupon_usages to authenticated;

create or replace function public.compute_order_pricing(p_items jsonb, p_coupon_code text, p_lock_coupon boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item jsonb; v_product public.products%rowtype; v_campaign public.campaigns%rowtype; v_coupon public.coupons%rowtype;
  v_quantity integer; v_line numeric(12,2); v_line_discount numeric(12,2); v_subtotal numeric(12,2) := 0;
  v_campaign_discount numeric(12,2) := 0; v_coupon_discount numeric(12,2) := 0; v_remaining numeric(12,2);
  v_lines jsonb := '[]'::jsonb; v_campaigns jsonb := '[]'::jsonb; v_code text := upper(trim(coalesce(p_coupon_code,'')));
  v_total_usage integer; v_user_usage integer;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'invalid_items'; end if;
  for v_item in select value from jsonb_array_elements(p_items) loop
    v_quantity := (v_item->>'quantity')::integer;
    if v_quantity < 1 or v_quantity > 10 then raise exception 'invalid_quantity'; end if;
    select * into v_product from public.products where sku = v_item->>'sku' and is_active limit 1;
    if not found or v_product.stock_quantity < v_quantity then raise exception 'product_unavailable'; end if;
    v_line := round(v_product.price * v_quantity, 2); v_subtotal := v_subtotal + v_line;
    v_lines := v_lines || jsonb_build_array(jsonb_build_object('product_id',v_product.id,'name',v_product.name,'slug',v_product.slug,'sku',v_product.sku,'quantity',v_quantity,'unit_price',v_product.price,'line_subtotal',v_line,'image_url',v_item->>'image_url'));
  end loop;
  for v_item in select value from jsonb_array_elements(v_lines) loop
    select * into v_product from public.products where id=(v_item->>'product_id')::uuid;
    select c.* into v_campaign from public.campaigns c
      where c.is_active and c.starts_at <= timezone('utc',now()) and c.ends_at >= timezone('utc',now())
        and c.minimum_order_amount <= v_subtotal
        and (c.product_id is null or c.product_id=v_product.id)
        and (c.category_id is null or c.category_id=v_product.category_id)
        and (c.brand_id is null or c.brand_id=v_product.brand_id)
      order by least((v_item->>'line_subtotal')::numeric,
        case when c.discount_type='percentage' then (v_item->>'line_subtotal')::numeric*c.discount_value/100 else c.discount_value end,
        coalesce(c.maximum_discount_amount, (v_item->>'line_subtotal')::numeric)) desc, c.created_at
      limit 1;
    if found then
      v_line_discount := round(least((v_item->>'line_subtotal')::numeric,
        case when v_campaign.discount_type='percentage' then (v_item->>'line_subtotal')::numeric*v_campaign.discount_value/100 else v_campaign.discount_value end,
        coalesce(v_campaign.maximum_discount_amount,(v_item->>'line_subtotal')::numeric)),2);
      v_campaign_discount := v_campaign_discount + v_line_discount;
      v_campaigns := v_campaigns || jsonb_build_array(jsonb_build_object('id',v_campaign.id,'name',v_campaign.name,'slug',v_campaign.slug,'discount_type',v_campaign.discount_type,'discount_value',v_campaign.discount_value,'product_id',v_product.id,'amount',v_line_discount));
    end if;
  end loop;
  v_remaining := greatest(0, v_subtotal-v_campaign_discount);
  if v_code <> '' then
    if p_lock_coupon then select * into v_coupon from public.coupons where code=v_code for update;
    else select * into v_coupon from public.coupons where code=v_code; end if;
    if not found or not v_coupon.is_active or v_coupon.starts_at > timezone('utc',now()) or v_coupon.ends_at < timezone('utc',now()) then raise exception 'coupon_invalid'; end if;
    if v_remaining < v_coupon.minimum_order_amount then raise exception 'coupon_minimum'; end if;
    select count(*) into v_total_usage from public.coupon_usages where coupon_id=v_coupon.id;
    if v_coupon.usage_limit is not null and v_total_usage >= v_coupon.usage_limit then raise exception 'coupon_limit'; end if;
    if v_coupon.usage_limit_per_user is not null then
      if auth.uid() is null then raise exception 'coupon_login_required'; end if;
      select count(*) into v_user_usage from public.coupon_usages where coupon_id=v_coupon.id and user_id=auth.uid();
      if v_user_usage >= v_coupon.usage_limit_per_user then raise exception 'coupon_user_limit'; end if;
    end if;
    v_coupon_discount := round(least(v_remaining,
      case when v_coupon.discount_type='percentage' then v_remaining*v_coupon.discount_value/100 else v_coupon.discount_value end,
      coalesce(v_coupon.maximum_discount_amount,v_remaining)),2);
  end if;
  return jsonb_build_object('subtotal',v_subtotal,'campaign_discount',v_campaign_discount,'coupon_discount',v_coupon_discount,'discount_total',least(v_subtotal,v_campaign_discount+v_coupon_discount),'payable_subtotal',greatest(0,v_subtotal-v_campaign_discount-v_coupon_discount),'items',v_lines,'campaigns',v_campaigns,'coupon',case when v_code='' then null else jsonb_build_object('id',v_coupon.id,'code',v_coupon.code,'description',v_coupon.description,'discount_type',v_coupon.discount_type,'discount_value',v_coupon.discount_value,'amount',v_coupon_discount) end);
end;
$$;

create or replace function public.calculate_checkout_pricing(p_items jsonb, p_coupon_code text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin return public.compute_order_pricing(p_items,p_coupon_code,false);
exception when others then return jsonb_build_object('valid',false,'error','promotion_invalid'); end;
$$;

create or replace function public.create_order(p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_order_id uuid; v_order_number text; v_item jsonb; v_pricing jsonb; v_shipping numeric(12,2); v_total numeric(12,2); v_tax numeric(12,2);
  v_delivery text := p_payload->>'delivery_method'; v_payment text := p_payload->>'payment_method';
begin
  if coalesce(p_payload->'delivery_address'->>'email','')='' or coalesce(p_payload->'delivery_address'->>'phone','')='' then raise exception 'invalid_contact'; end if;
  if v_delivery not in ('standard','express','store') or v_payment not in ('card','transfer','cash') then raise exception 'invalid_method'; end if;
  v_pricing := public.compute_order_pricing(p_payload->'items',p_payload->>'coupon_code',true);
  loop v_order_number := 'CG-'||extract(year from timezone('utc',now()))::text||'-'||lpad(floor(random()*100000000)::bigint::text,8,'0'); exit when not exists(select 1 from public.orders where order_number=v_order_number); end loop;
  v_shipping := case when v_delivery='express' then 199 when (v_pricing->>'payable_subtotal')::numeric<2500 and v_delivery='standard' then 149 else 0 end;
  v_total := greatest(0,(v_pricing->>'payable_subtotal')::numeric+v_shipping); v_tax := round(v_total-(v_total/1.20),2);
  insert into public.orders(order_number,user_id,status,payment_method,payment_status,delivery_method,subtotal,discount_total,shipping_total,tax_total,grand_total,delivery_address,billing_address,status_history,coupon_snapshot,campaign_snapshots)
  values(v_order_number,auth.uid(),'received',v_payment,'pending',v_delivery,(v_pricing->>'subtotal')::numeric,(v_pricing->>'discount_total')::numeric,v_shipping,v_tax,v_total,p_payload->'delivery_address',p_payload->'billing_address',jsonb_build_array(jsonb_build_object('status','received','label','Sipariş alındı','at',timezone('utc',now()))),v_pricing->'coupon',v_pricing->'campaigns') returning id into v_order_id;
  for v_item in select value from jsonb_array_elements(v_pricing->'items') loop
    insert into public.order_items(order_id,product_id,product_name,sku,quantity,unit_price,discount_total,line_total,product_snapshot)
    values(v_order_id,(v_item->>'product_id')::uuid,v_item->>'name',v_item->>'sku',(v_item->>'quantity')::integer,(v_item->>'unit_price')::numeric,0,(v_item->>'line_subtotal')::numeric,jsonb_build_object('slug',v_item->>'slug','image_url',v_item->>'image_url'));
  end loop;
  if v_pricing->'coupon' is not null then insert into public.coupon_usages(coupon_id,user_id,order_id) values((v_pricing->'coupon'->>'id')::uuid,auth.uid(),v_order_id); end if;
  return jsonb_build_object('id',v_order_id,'order_number',v_order_number,'grand_total',v_total,'subtotal',(v_pricing->>'subtotal')::numeric,'discount_total',(v_pricing->>'discount_total')::numeric,'campaign_discount',(v_pricing->>'campaign_discount')::numeric,'coupon_discount',(v_pricing->>'coupon_discount')::numeric,'created_at',timezone('utc',now()));
end;
$$;

revoke all on function public.compute_order_pricing(jsonb,text,boolean) from public;
revoke all on function public.calculate_checkout_pricing(jsonb,text) from public;
revoke all on function public.create_order(jsonb) from public;
grant execute on function public.calculate_checkout_pricing(jsonb,text) to anon, authenticated;
grant execute on function public.create_order(jsonb) to anon, authenticated;

commit;
