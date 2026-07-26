create table if not exists public.notification_templates (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9_]+$'),
  name text not null,
  channel text not null check (channel in ('email','sms','whatsapp','push','in_app')),
  subject text,
  body text not null,
  variables jsonb not null default '[]'::jsonb check (jsonb_typeof(variables) = 'array'),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.notification_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (length(event_type) between 3 and 100),
  entity_type text not null,
  entity_id text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','processing','processed','failed')),
  created_at timestamptz not null default timezone('utc', now()),
  processed_at timestamptz
);

create table if not exists public.notification_queue (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.notification_events(id) on delete cascade,
  template_id uuid references public.notification_templates(id) on delete set null,
  channel text not null check (channel in ('email','sms','whatsapp','push','in_app')),
  recipient text not null,
  status text not null default 'pending' check (status in ('pending','processing','sent','failed','cancelled')),
  retry_count integer not null default 0 check (retry_count >= 0),
  scheduled_at timestamptz not null default timezone('utc', now()),
  processed_at timestamptz,
  last_error text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.notification_logs (
  id uuid primary key default gen_random_uuid(),
  queue_id uuid not null references public.notification_queue(id) on delete cascade,
  channel text not null,
  recipient text not null,
  status text not null check (status in ('pending','sent','failed')),
  provider text not null,
  response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists notification_events_status_created_idx on public.notification_events(status, created_at);
create index if not exists notification_events_type_idx on public.notification_events(event_type, created_at desc);
create index if not exists notification_queue_worker_idx on public.notification_queue(status, scheduled_at) where status in ('pending','failed');
create index if not exists notification_queue_event_idx on public.notification_queue(event_id);
create index if not exists notification_logs_queue_idx on public.notification_logs(queue_id, created_at desc);
create index if not exists notification_logs_status_idx on public.notification_logs(status, created_at desc);

alter table public.notification_templates enable row level security;
alter table public.notification_events enable row level security;
alter table public.notification_queue enable row level security;
alter table public.notification_logs enable row level security;

revoke all on public.notification_templates, public.notification_events, public.notification_queue, public.notification_logs from anon, authenticated;
grant select on public.notification_templates, public.notification_events, public.notification_queue, public.notification_logs to authenticated;

create policy "Admins read notification templates" on public.notification_templates for select to authenticated using (public.is_admin());
create policy "Admins read notification events" on public.notification_events for select to authenticated using (public.is_admin());
create policy "Admins read notification queue" on public.notification_queue for select to authenticated using (public.is_admin());
create policy "Admins read notification logs" on public.notification_logs for select to authenticated using (public.is_admin());

create or replace function public.admin_save_notification_template(p_template jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not public.is_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
  if trim(coalesce(p_template->>'code','')) = '' or trim(coalesce(p_template->>'name','')) = '' or trim(coalesce(p_template->>'body','')) = '' then
    raise exception 'invalid_template' using errcode = '22023';
  end if;
  insert into public.notification_templates(id,code,name,channel,subject,body,variables,is_active)
  values (
    coalesce(nullif(p_template->>'id','')::uuid, gen_random_uuid()), lower(trim(p_template->>'code')),
    trim(p_template->>'name'), p_template->>'channel', nullif(trim(p_template->>'subject'),''),
    p_template->>'body', coalesce(p_template->'variables','[]'::jsonb), coalesce((p_template->>'is_active')::boolean,true)
  ) on conflict (id) do update set code=excluded.code,name=excluded.name,channel=excluded.channel,
    subject=excluded.subject,body=excluded.body,variables=excluded.variables,is_active=excluded.is_active,updated_at=timezone('utc',now())
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.publish_notification_event(
  p_event_type text, p_entity_type text, p_entity_id text, p_payload jsonb
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_event_id uuid; v_template record; v_recipient text;
begin
  if not public.is_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
  insert into public.notification_events(event_type,entity_type,entity_id,payload)
  values(lower(trim(p_event_type)),lower(trim(p_entity_type)),nullif(trim(p_entity_id),''),coalesce(p_payload,'{}'::jsonb)) returning id into v_event_id;
  for v_template in select * from public.notification_templates where is_active and code like lower(trim(p_event_type)) || '\_%' escape '\' loop
    v_recipient := case v_template.channel
      when 'email' then p_payload->>'recipient_email' when 'sms' then p_payload->>'recipient_phone'
      when 'whatsapp' then p_payload->>'recipient_phone' when 'push' then p_payload->>'push_token'
      else coalesce(p_payload->>'user_id', p_payload->>'recipient_email') end;
    if nullif(trim(v_recipient),'') is not null then
      insert into public.notification_queue(event_id,template_id,channel,recipient)
      values(v_event_id,v_template.id,v_template.channel,v_recipient);
    end if;
  end loop;
  update public.notification_events set status='processed',processed_at=timezone('utc',now()) where id=v_event_id;
  return v_event_id;
end $$;

create or replace function public.admin_complete_notification(
  p_queue_id uuid, p_success boolean, p_provider text, p_response jsonb, p_error text default null
) returns boolean language plpgsql security definer set search_path = '' as $$
declare v_queue public.notification_queue%rowtype;
begin
  if not public.is_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
  select * into v_queue from public.notification_queue where id=p_queue_id for update;
  if not found then raise exception 'queue_not_found' using errcode='P0002'; end if;
  update public.notification_queue set status=case when p_success then 'sent' else 'failed' end,
    retry_count=case when p_success then retry_count else retry_count+1 end,
    processed_at=timezone('utc',now()),last_error=case when p_success then null else left(p_error,500) end where id=p_queue_id;
  insert into public.notification_logs(queue_id,channel,recipient,status,provider,response)
  values(v_queue.id,v_queue.channel,v_queue.recipient,case when p_success then 'sent' else 'failed' end,p_provider,coalesce(p_response,'{}'::jsonb));
  return true;
end $$;

revoke all on function public.admin_save_notification_template(jsonb) from public,anon;
revoke all on function public.publish_notification_event(text,text,text,jsonb) from public,anon;
revoke all on function public.admin_complete_notification(uuid,boolean,text,jsonb,text) from public,anon;
grant execute on function public.admin_save_notification_template(jsonb), public.publish_notification_event(text,text,text,jsonb), public.admin_complete_notification(uuid,boolean,text,jsonb,text) to authenticated;

insert into public.notification_templates(code,name,channel,subject,body,variables) values
('order_created_email','Yeni sipariş e-postası','email','Siparişiniz alındı: {{order_number}}','Merhaba {{customer_name}}, {{order_number}} numaralı siparişiniz alındı. Toplam: {{total_amount}}. {{company_name}}','["customer_name","order_number","total_amount","company_name"]'),
('shipment_shipped_sms','Kargoya verildi SMS','sms',null,'{{order_number}} siparişiniz kargoya verildi. Takip: {{tracking_number}}','["order_number","tracking_number"]'),
('stock_low_in_app','Düşük stok bildirimi','in_app','Düşük stok: {{product_name}}','{{product_name}} ürünü kritik stok seviyesine ulaştı.','["product_name"]')
on conflict (code) do nothing;

drop trigger if exists audit_notification_templates_changes on public.notification_templates;
create trigger audit_notification_templates_changes
after insert or update or delete on public.notification_templates
for each row execute function public.audit_row_change('settings', 'settings');
