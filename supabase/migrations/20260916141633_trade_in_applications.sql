begin;

create table public.trade_in_applications (
  id uuid primary key default gen_random_uuid(),
  application_number text not null unique,
  customer_name text not null check (char_length(customer_name) between 2 and 120),
  phone_e164 text not null check (phone_e164 ~ '^\+905[0-9]{9}$'),
  device_brand text not null check (char_length(device_brand) between 1 and 60),
  device_model text not null check (char_length(device_model) between 1 and 120),
  storage_capacity text check (storage_capacity is null or char_length(storage_capacity) <= 40),
  screen_condition text not null check (screen_condition in ('clean','scratched','cracked')),
  body_condition text not null check (body_condition in ('clean','used','damaged')),
  powers_on boolean not null,
  repair_status text not null check (repair_status in ('no','yes','unknown')),
  battery_health smallint check (battery_health is null or battery_health between 1 and 100),
  has_box boolean not null default false,
  desired_product text check (desired_product is null or char_length(desired_product) <= 160),
  customer_note text check (customer_note is null or char_length(customer_note) <= 1000),
  status text not null default 'new' check (status in ('new','reviewing','offer_sent','accepted','rejected','completed','cancelled')),
  offer_amount_minor bigint check (offer_amount_minor is null or offer_amount_minor >= 0),
  customer_response_note text check (customer_response_note is null or char_length(customer_response_note) <= 1000),
  internal_note text check (internal_note is null or char_length(internal_note) <= 2000),
  consented_at timestamptz not null,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on update cascade on delete set null,
  request_ip_hash text check (request_ip_hash is null or char_length(request_ip_hash) = 64),
  user_agent_summary text check (user_agent_summary is null or char_length(user_agent_summary) <= 300),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.trade_in_photos (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.trade_in_applications(id) on update cascade on delete cascade,
  storage_path text not null unique,
  sort_order smallint not null check (sort_order between 0 and 3),
  stored_mime_type text not null default 'image/webp' check (stored_mime_type = 'image/webp'),
  size_bytes integer not null check (size_bytes between 1 and 1048576),
  sha256 text not null check (char_length(sha256) = 64),
  width integer not null check (width between 1 and 5000),
  height integer not null check (height between 1 and 5000),
  created_at timestamptz not null default timezone('utc', now()),
  unique (application_id, sort_order)
);

create table public.trade_in_rate_limits (
  key_hash text not null,
  window_started_at timestamptz not null,
  request_count integer not null default 1 check (request_count > 0),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (key_hash, window_started_at)
);

create index trade_in_applications_status_created_idx
  on public.trade_in_applications(status, created_at desc);
create index trade_in_applications_phone_created_idx
  on public.trade_in_applications(phone_e164, created_at desc);
create index trade_in_applications_reviewed_by_idx
  on public.trade_in_applications(reviewed_by) where reviewed_by is not null;
create index trade_in_photos_application_idx
  on public.trade_in_photos(application_id, sort_order);
create index trade_in_rate_limits_updated_idx
  on public.trade_in_rate_limits(updated_at);

create trigger set_trade_in_applications_updated_at
before update on public.trade_in_applications
for each row execute function public.set_updated_at();

alter table public.trade_in_applications enable row level security;
alter table public.trade_in_applications force row level security;
alter table public.trade_in_photos enable row level security;
alter table public.trade_in_photos force row level security;
alter table public.trade_in_rate_limits enable row level security;
alter table public.trade_in_rate_limits force row level security;

revoke all on public.trade_in_applications from public, anon, authenticated;
revoke all on public.trade_in_photos from public, anon, authenticated;
revoke all on public.trade_in_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on public.trade_in_applications to service_role;
grant select, insert, update, delete on public.trade_in_photos to service_role;
grant select, insert, update, delete on public.trade_in_rate_limits to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'trade-in-private',
  'trade-in-private',
  false,
  1048576,
  array['image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.consume_trade_in_rate_limit(
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window timestamptz;
  v_count integer;
begin
  if char_length(p_key_hash) <> 64
    or p_limit < 1 or p_limit > 100
    or p_window_seconds < 60 or p_window_seconds > 86400 then
    raise exception 'invalid_rate_limit_parameters';
  end if;

  v_window := to_timestamp(
    floor(extract(epoch from timezone('utc', now())) / p_window_seconds) * p_window_seconds
  );

  insert into public.trade_in_rate_limits(
    key_hash, window_started_at, request_count
  ) values (p_key_hash, v_window, 1)
  on conflict (key_hash, window_started_at) do update
  set request_count = public.trade_in_rate_limits.request_count + 1,
      updated_at = timezone('utc', now())
  where public.trade_in_rate_limits.request_count < p_limit
  returning request_count into v_count;

  delete from public.trade_in_rate_limits
  where updated_at < timezone('utc', now()) - interval '48 hours';

  return v_count is not null and v_count <= p_limit;
end;
$$;

revoke all on function public.consume_trade_in_rate_limit(text,integer,integer)
  from public, anon, authenticated;
grant execute on function public.consume_trade_in_rate_limit(text,integer,integer)
  to service_role;

comment on table public.trade_in_applications is
  'Customer trade-in valuation requests. Service-role only; does not reserve stock or create orders.';
comment on table public.trade_in_photos is
  'Private, processed WebP photos attached to trade-in applications.';

commit;
