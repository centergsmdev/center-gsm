begin;

alter table public.shipments add column if not exists external_shipment_id text;
alter table public.shipments add column if not exists idempotency_key text;
alter table public.shipments add column if not exists provider_status text;
alter table public.shipments add column if not exists last_synced_at timestamptz;
create unique index if not exists shipments_provider_external_unique on public.shipments(provider_key, external_shipment_id) where external_shipment_id is not null;
create unique index if not exists shipments_idempotency_unique on public.shipments(idempotency_key) where idempotency_key is not null;

alter table public.shipment_events add column if not exists external_event_id text;
alter table public.shipment_events add column if not exists event_hash text;
alter table public.shipment_events add column if not exists metadata jsonb not null default '{}'::jsonb;
create unique index if not exists shipment_events_external_unique on public.shipment_events(shipment_id, external_event_id) where external_event_id is not null;
create unique index if not exists shipment_events_hash_unique on public.shipment_events(shipment_id, event_hash) where event_hash is not null;

create table if not exists public.shipping_provider_settings (
  id uuid primary key default gen_random_uuid(),
  carrier_id uuid not null references public.shipping_carriers(id) on delete cascade,
  provider_key text not null check(provider_key in ('manual','mock','yurtici','aras','mng','surat','ptt','hepsijet')),
  environment text not null default 'sandbox' check(environment in ('sandbox','production')),
  is_active boolean not null default false,
  configuration_reference text,
  webhook_secret_hash text,
  health_status text not null default 'unknown' check(health_status in ('unknown','healthy','degraded','down')),
  last_health_check_at timestamptz, last_success_at timestamptz, last_error_at timestamptz,
  created_at timestamptz not null default timezone('utc',now()), updated_at timestamptz not null default timezone('utc',now()),
  unique(carrier_id), unique(provider_key),
  check(configuration_reference is null or configuration_reference ~ '^[A-Z][A-Z0-9_]{2,100}$')
);
create table if not exists public.shipping_webhooks (
  id uuid primary key default gen_random_uuid(), provider_key text not null, external_event_id text not null, event_type text not null,
  tracking_number text, shipment_id uuid references public.shipments(id) on delete set null, payload_summary jsonb not null default '{}'::jsonb,
  payload_hash text not null, signature_valid boolean not null default false, status text not null default 'received' check(status in ('received','processing','processed','failed','ignored')),
  retry_count integer not null default 0 check(retry_count>=0), received_at timestamptz not null default timezone('utc',now()), processed_at timestamptz,
  last_error text, created_at timestamptz not null default timezone('utc',now()), unique(provider_key,external_event_id), unique(provider_key,payload_hash)
);
create table if not exists public.shipping_labels (
  id uuid primary key default gen_random_uuid(), shipment_id uuid not null references public.shipments(id) on delete cascade, provider_key text not null,
  label_format text not null check(label_format in ('pdf','zpl','png','html')), storage_path text, content_hash text not null,
  status text not null default 'ready' check(status in ('pending','ready','invalidated','failed')),
  created_at timestamptz not null default timezone('utc',now()), updated_at timestamptz not null default timezone('utc',now()),
  unique(shipment_id,label_format,content_hash), check(storage_path is null or storage_path !~ '^https?://')
);
create table if not exists public.shipping_rate_quotes (
  id uuid primary key default gen_random_uuid(), provider_key text not null, order_id uuid references public.orders(id) on delete cascade,
  warehouse_id uuid not null references public.warehouses(id) on delete restrict, destination_postal_code text not null,
  package_count integer not null check(package_count>0), total_weight numeric(10,3) not null check(total_weight>0), desi numeric(10,2) not null check(desi>0),
  amount numeric(12,2) not null check(amount>=0), currency text not null default 'TRY' check(currency='TRY'),
  estimated_delivery_min integer not null check(estimated_delivery_min>=0), estimated_delivery_max integer not null check(estimated_delivery_max>=estimated_delivery_min),
  expires_at timestamptz not null, created_at timestamptz not null default timezone('utc',now())
);
create table if not exists public.shipping_sync_jobs (
  id uuid primary key default gen_random_uuid(), shipment_id uuid references public.shipments(id) on delete cascade, provider_key text not null,
  job_type text not null check(job_type in ('tracking_sync','label_create','shipment_create','shipment_cancel','health_check')),
  status text not null default 'pending' check(status in ('pending','processing','completed','failed','cancelled')),
  attempt_count integer not null default 0 check(attempt_count between 0 and 10), scheduled_at timestamptz not null default timezone('utc',now()),
  started_at timestamptz, completed_at timestamptz, last_error text, created_at timestamptz not null default timezone('utc',now())
);

create index if not exists shipping_webhooks_received_idx on public.shipping_webhooks(received_at desc,provider_key,status);
create index if not exists shipping_labels_shipment_idx on public.shipping_labels(shipment_id,status);
create index if not exists shipping_rate_quotes_expiry_idx on public.shipping_rate_quotes(expires_at,provider_key);
create index if not exists shipping_sync_jobs_schedule_idx on public.shipping_sync_jobs(status,scheduled_at);

insert into public.shipping_carriers(name,code,provider_key,description,is_active,is_default,supports_api) values
('Mock Kargo','MOCK','mock','Yalnızca sandbox testleri için mock sağlayıcı',true,false,true),
('Yurtiçi Kargo','YURTICI','yurtici','Entegrasyon hazır değil',false,false,true),('Aras Kargo','ARAS','aras','Entegrasyon hazır değil',false,false,true),
('MNG Kargo','MNG','mng','Entegrasyon hazır değil',false,false,true),('Sürat Kargo','SURAT','surat','Entegrasyon hazır değil',false,false,true),
('PTT Kargo','PTT','ptt','Entegrasyon hazır değil',false,false,true),('Hepsijet','HEPSIJET','hepsijet','Entegrasyon hazır değil',false,false,true)
on conflict(code) do nothing;
insert into public.shipping_provider_settings(carrier_id,provider_key,environment,is_active)
select id,provider_key,'sandbox',provider_key='mock' from public.shipping_carriers where provider_key in ('mock','yurtici','aras','mng','surat','ptt','hepsijet') on conflict(provider_key) do nothing;

alter table public.shipping_provider_settings enable row level security; alter table public.shipping_webhooks enable row level security;
alter table public.shipping_labels enable row level security; alter table public.shipping_rate_quotes enable row level security; alter table public.shipping_sync_jobs enable row level security;
revoke all on public.shipping_provider_settings,public.shipping_webhooks,public.shipping_labels,public.shipping_rate_quotes,public.shipping_sync_jobs from anon,authenticated;
grant select on public.shipping_provider_settings,public.shipping_webhooks,public.shipping_labels,public.shipping_rate_quotes,public.shipping_sync_jobs to authenticated;
create policy "Admins read shipping providers" on public.shipping_provider_settings for select to authenticated using(public.is_admin());
create policy "Admins read shipping webhooks" on public.shipping_webhooks for select to authenticated using(public.is_admin());
create policy "Admins read shipping labels" on public.shipping_labels for select to authenticated using(public.is_admin());
create policy "Admins read shipping rates" on public.shipping_rate_quotes for select to authenticated using(public.is_admin());
create policy "Admins read shipping jobs" on public.shipping_sync_jobs for select to authenticated using(public.is_admin());

create or replace function public.admin_update_shipping_provider(p_id uuid,p_active boolean,p_environment text) returns boolean language plpgsql security definer set search_path='' as $$
begin if not public.is_admin() then raise exception 'admin_required' using errcode='42501'; end if; if p_environment not in ('sandbox','production') then raise exception 'invalid_environment'; end if;
update public.shipping_provider_settings set is_active=p_active,environment=p_environment,updated_at=timezone('utc',now()) where id=p_id;
perform public.write_audit_log('shipping_provider_updated','shipment',p_id::text,'Shipping provider',null,jsonb_build_object('is_active',p_active,'environment',p_environment),'{}'); return found; end$$;
create or replace function public.admin_set_shipping_webhook_secret(p_id uuid,p_secret text) returns boolean language plpgsql security definer set search_path='' as $$
begin if not public.is_admin() then raise exception 'admin_required'; end if; if length(p_secret)<16 then raise exception 'weak_secret'; end if; update public.shipping_provider_settings set webhook_secret_hash=extensions.crypt(p_secret,extensions.gen_salt('bf')),updated_at=timezone('utc',now()) where id=p_id; return found; end$$;

create or replace function public.create_shipping_sync_job(p_shipment_id uuid,p_provider_key text,p_job_type text) returns uuid language plpgsql security definer set search_path='' as $$ declare v_id uuid;
begin if not public.is_admin() then raise exception 'admin_required'; end if; insert into public.shipping_sync_jobs(shipment_id,provider_key,job_type) values(p_shipment_id,p_provider_key,p_job_type) returning id into v_id; return v_id; end$$;
create or replace function public.admin_retry_shipping_job(p_job_id uuid) returns boolean language plpgsql security definer set search_path='' as $$
begin if not public.is_admin() then raise exception 'admin_required'; end if; update public.shipping_sync_jobs set status='pending',attempt_count=attempt_count+1,scheduled_at=timezone('utc',now()),started_at=null,completed_at=null,last_error=null where id=p_job_id and status='failed' and attempt_count<5; perform public.write_audit_log('shipment_sync_retried','shipment',p_job_id::text,'Shipping sync',null,null,'{}'); return found; end$$;
create or replace function public.admin_create_mock_shipment(p_order_id uuid,p_carrier_id uuid,p_items jsonb,p_idempotency_key text,p_package jsonb default '{}'::jsonb) returns uuid language plpgsql security definer set search_path='' as $$ declare v_id uuid;
begin if not public.is_admin() then raise exception 'admin_required'; end if; if exists(select 1 from public.shipments where idempotency_key=p_idempotency_key) then raise exception 'shipment_already_exists'; end if;
v_id:=public.create_manual_shipment(p_order_id,p_carrier_id,p_items,null,null,p_package,0,'Mock gateway shipment'); update public.shipments set provider_key='mock',idempotency_key=p_idempotency_key,external_shipment_id='MOCK-'||replace(v_id::text,'-',''),tracking_number='MCK'||upper(substr(replace(v_id::text,'-',''),1,12)),provider_status='created' where id=v_id;
insert into public.shipping_sync_jobs(shipment_id,provider_key,job_type,status,completed_at) values(v_id,'mock','shipment_create','completed',timezone('utc',now())); return v_id; end$$;
create or replace function public.admin_cancel_provider_shipment(p_shipment_id uuid) returns boolean language plpgsql security definer set search_path='' as $$ begin if not public.is_admin() then raise exception 'admin_required'; end if; perform public.update_shipment_status(p_shipment_id,'cancelled','Provider gönderisi iptal edildi',null); insert into public.shipping_sync_jobs(shipment_id,provider_key,job_type,status,completed_at) select id,provider_key,'shipment_cancel','completed',timezone('utc',now()) from public.shipments where id=p_shipment_id; return true; end$$;
create or replace function public.register_shipping_webhook(p_provider_key text,p_external_event_id text,p_event_type text,p_tracking_number text,p_payload_hash text,p_payload_summary jsonb,p_signature_valid boolean,p_provider_secret text) returns uuid language plpgsql security definer set search_path='' as $$ declare v_id uuid; v_hash text; begin if not p_signature_valid then raise exception 'invalid_webhook_signature'; end if; select webhook_secret_hash into v_hash from public.shipping_provider_settings where provider_key=p_provider_key and is_active; if v_hash is null or extensions.crypt(p_provider_secret,v_hash)<>v_hash then raise exception 'invalid_webhook_signature'; end if;
insert into public.shipping_webhooks(provider_key,external_event_id,event_type,tracking_number,payload_hash,payload_summary,signature_valid) values(p_provider_key,p_external_event_id,p_event_type,nullif(p_tracking_number,''),p_payload_hash,coalesce(p_payload_summary,'{}'),true) on conflict(provider_key,external_event_id) do update set retry_count=shipping_webhooks.retry_count+1 returning id into v_id; return v_id; exception when unique_violation then raise exception 'webhook_replayed'; end$$;
create or replace function public.upsert_shipping_tracking_event(p_shipment_id uuid,p_external_event_id text,p_status text,p_raw_status text,p_title text,p_description text,p_location text,p_occurred_at timestamptz,p_event_hash text) returns boolean language plpgsql security definer set search_path='' as $$
begin insert into public.shipment_events(shipment_id,status,title,description,location,event_time,provider_event_code,external_event_id,event_hash,metadata) values(p_shipment_id,p_status,p_title,nullif(p_description,''),nullif(p_location,''),p_occurred_at,p_raw_status,p_external_event_id,p_event_hash,jsonb_build_object('raw_status',p_raw_status)) on conflict do nothing; update public.shipments set status=p_status,provider_status=p_raw_status,last_synced_at=timezone('utc',now()),delivered_at=case when p_status='delivered' then coalesce(delivered_at,p_occurred_at) else delivered_at end where id=p_shipment_id; perform public.recalculate_order_fulfillment((select order_id from public.shipments where id=p_shipment_id)); return true; end$$;
create or replace function public.complete_shipping_webhook(p_webhook_id uuid,p_shipment_id uuid,p_status text,p_error text default null) returns boolean language plpgsql security definer set search_path='' as $$ begin update public.shipping_webhooks set shipment_id=p_shipment_id,status=p_status,processed_at=timezone('utc',now()),last_error=case when p_error is null then null else 'İşlem tamamlanamadı' end where id=p_webhook_id; return found; end$$;

revoke all on function public.admin_update_shipping_provider(uuid,boolean,text),public.admin_set_shipping_webhook_secret(uuid,text),public.create_shipping_sync_job(uuid,text,text),public.admin_retry_shipping_job(uuid),public.admin_create_mock_shipment(uuid,uuid,jsonb,text,jsonb),public.admin_cancel_provider_shipment(uuid) from public,anon;
grant execute on function public.admin_update_shipping_provider(uuid,boolean,text),public.admin_set_shipping_webhook_secret(uuid,text),public.create_shipping_sync_job(uuid,text,text),public.admin_retry_shipping_job(uuid),public.admin_create_mock_shipment(uuid,uuid,jsonb,text,jsonb),public.admin_cancel_provider_shipment(uuid) to authenticated;
revoke all on function public.register_shipping_webhook(text,text,text,text,text,jsonb,boolean,text),public.complete_shipping_webhook(uuid,uuid,text,text),public.upsert_shipping_tracking_event(uuid,text,text,text,text,text,text,timestamptz,text) from public;
grant execute on function public.register_shipping_webhook(text,text,text,text,text,jsonb,boolean,text) to anon,authenticated;
grant execute on function public.complete_shipping_webhook(uuid,uuid,text,text),public.upsert_shipping_tracking_event(uuid,text,text,text,text,text,text,timestamptz,text) to authenticated;

drop trigger if exists audit_shipping_provider_settings_changes on public.shipping_provider_settings; create trigger audit_shipping_provider_settings_changes after insert or update or delete on public.shipping_provider_settings for each row execute function public.audit_row_change('shipment','shipment');
drop trigger if exists audit_shipping_labels_changes on public.shipping_labels; create trigger audit_shipping_labels_changes after insert or update or delete on public.shipping_labels for each row execute function public.audit_row_change('shipment','shipment');

commit;
