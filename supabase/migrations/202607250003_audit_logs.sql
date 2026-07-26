-- Production audit log: append-only, admin-readable and system-written.
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_email text,
  actor_role text,
  action text not null check (length(action) between 3 and 100),
  entity_type text not null check (length(entity_type) between 2 and 80),
  entity_id text,
  entity_name text,
  old_data jsonb,
  new_data jsonb,
  metadata jsonb not null default '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index if not exists audit_logs_actor_idx on public.audit_logs (actor_user_id, created_at desc);
create index if not exists audit_logs_action_idx on public.audit_logs (action, created_at desc);
create index if not exists audit_logs_entity_idx on public.audit_logs (entity_type, entity_id, created_at desc);
create index if not exists audit_logs_search_idx on public.audit_logs using gin
  (to_tsvector('simple', coalesce(actor_email, '') || ' ' || coalesce(entity_name, '') || ' ' || action));

alter table public.audit_logs enable row level security;
alter table public.audit_logs force row level security;

revoke all on public.audit_logs from anon, authenticated;
grant select on public.audit_logs to authenticated;

create policy "Admins can read audit logs"
on public.audit_logs for select to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create or replace function public.audit_changed_fields(p_old jsonb, p_new jsonb)
returns table(old_values jsonb, new_values jsonb)
language sql immutable
set search_path = ''
as $$
  with keys as (
    select key from jsonb_object_keys(coalesce(p_old, '{}'::jsonb)) key
    union
    select key from jsonb_object_keys(coalesce(p_new, '{}'::jsonb)) key
  ), changed as (
    select key
    from keys
    where coalesce(p_old -> key, 'null'::jsonb) is distinct from coalesce(p_new -> key, 'null'::jsonb)
      and key not in ('updated_at', 'created_at')
  )
  select
    coalesce(jsonb_object_agg(key, p_old -> key), '{}'::jsonb),
    coalesce(jsonb_object_agg(key, p_new -> key), '{}'::jsonb)
  from changed;
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$ select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false) $$;

create or replace function public.write_audit_log(
  p_action text,
  p_entity_type text,
  p_entity_id text default null,
  p_entity_name text default null,
  p_old_data jsonb default null,
  p_new_data jsonb default null,
  p_metadata jsonb default '{}'::jsonb
) returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_headers jsonb := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb;
begin
  if not public.is_admin() then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  insert into public.audit_logs (
    actor_user_id, actor_email, actor_role, action, entity_type, entity_id,
    entity_name, old_data, new_data, metadata, ip_address, user_agent
  ) values (
    auth.uid(), auth.jwt() ->> 'email', auth.jwt() -> 'app_metadata' ->> 'role',
    lower(trim(p_action)), lower(trim(p_entity_type)), nullif(trim(p_entity_id), ''),
    nullif(trim(p_entity_name), ''), p_old_data, p_new_data,
    coalesce(p_metadata, '{}'::jsonb),
    nullif(split_part(coalesce(v_headers ->> 'x-forwarded-for', ''), ',', 1), '')::inet,
    nullif(v_headers ->> 'user-agent', '')
  ) returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.write_audit_log(text,text,text,text,jsonb,jsonb,jsonb) from public, anon;
grant execute on function public.write_audit_log(text,text,text,text,jsonb,jsonb,jsonb) to authenticated;

create or replace function public.audit_row_change()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_old jsonb := case when tg_op = 'INSERT' then '{}'::jsonb else to_jsonb(old) end;
  v_new jsonb := case when tg_op = 'DELETE' then '{}'::jsonb else to_jsonb(new) end;
  v_old_changed jsonb;
  v_new_changed jsonb;
  v_row jsonb := case when tg_op = 'DELETE' then v_old else v_new end;
  v_action text;
  v_headers jsonb := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb;
begin
  if tg_op = 'UPDATE' and v_old = v_new then return new; end if;
  select old_values, new_values into v_old_changed, v_new_changed
  from public.audit_changed_fields(v_old, v_new);

  v_action := case
    when tg_argv[1] = 'inventory' then 'inventory_adjusted'
    when tg_argv[1] in ('warehouse', 'payment', 'settings') then tg_argv[1] || '_updated'
    when tg_op = 'INSERT' then tg_argv[1] || '_created'
    when tg_op = 'DELETE' then tg_argv[1] || '_deleted'
    when tg_argv[1] = 'product' and (v_old ->> 'is_active')::boolean and not (v_new ->> 'is_active')::boolean then 'product_deleted'
    else tg_argv[1] || '_updated'
  end;

  insert into public.audit_logs (
    actor_user_id, actor_email, actor_role, action, entity_type, entity_id,
    entity_name, old_data, new_data, metadata, ip_address, user_agent
  ) values (
    auth.uid(), auth.jwt() ->> 'email', coalesce(auth.jwt() -> 'app_metadata' ->> 'role', 'system'),
    v_action, tg_argv[0], v_row ->> 'id',
    coalesce(v_row ->> 'name', v_row ->> 'order_number', v_row ->> 'code', v_row ->> 'sku'),
    nullif(v_old_changed, '{}'::jsonb), nullif(v_new_changed, '{}'::jsonb),
    jsonb_strip_nulls(jsonb_build_object(
      'sku', v_row ->> 'sku', 'order_number', v_row ->> 'order_number',
      'tracking_number', v_row ->> 'tracking_number', 'warehouse_id', v_row ->> 'warehouse_id',
      'coupon_code', v_row ->> 'code'
    )),
    nullif(split_part(coalesce(v_headers ->> 'x-forwarded-for', ''), ',', 1), '')::inet,
    nullif(v_headers ->> 'user-agent', '')
  );
  return coalesce(new, old);
end;
$$;

revoke all on function public.audit_row_change() from public, anon, authenticated;

do $$
declare item record;
begin
  for item in select * from (values
    ('products','product'), ('categories','category'), ('brands','brand'),
    ('campaigns','campaign'), ('coupons','coupon'), ('orders','order'),
    ('payment_transactions','payment'), ('payment_accounts','payment'),
    ('shipments','shipment'), ('inventory','inventory'),
    ('inventory_movements','inventory'), ('warehouses','warehouse'),
    ('shipping_carriers','settings'), ('profiles','user')
  ) as tracked(table_name, entity_type)
  loop
    if to_regclass('public.' || item.table_name) is not null then
      execute format('drop trigger if exists audit_%I_changes on public.%I', item.table_name, item.table_name);
      execute format(
        'create trigger audit_%I_changes after insert or update or delete on public.%I for each row execute function public.audit_row_change(%L, %L)',
        item.table_name, item.table_name, item.entity_type, item.entity_type
      );
    end if;
  end loop;
end $$;

comment on table public.audit_logs is 'Immutable administrative audit trail. Writes are only permitted through security-definer functions and database triggers.';
