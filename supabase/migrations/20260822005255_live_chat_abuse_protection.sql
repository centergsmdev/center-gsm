begin;

-- Privacy-minimising abuse identity observations. Raw IP addresses and raw
-- first-party abuse tokens are never stored in these tables.
create table if not exists public.live_chat_abuse_identities (
  conversation_id uuid primary key references public.live_chat_conversations(id) on delete cascade,
  visitor_token uuid not null,
  user_id uuid references auth.users(id) on delete set null,
  abuse_token_hash text,
  ip_hash text,
  network_label text,
  device_profile_hash text,
  browser_family text,
  os_family text,
  viewport_class text,
  timezone text,
  language text,
  display_names text[] not null default '{}'::text[],
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  constraint live_chat_abuse_hash_format check (
    (abuse_token_hash is null or abuse_token_hash ~ '^[0-9a-f]{64}$')
    and (ip_hash is null or ip_hash ~ '^[0-9a-f]{64}$')
    and (device_profile_hash is null or device_profile_hash ~ '^[0-9a-f]{64}$')
  )
);

create index if not exists live_chat_abuse_visitor_idx
  on public.live_chat_abuse_identities(visitor_token, last_seen_at desc);
create index if not exists live_chat_abuse_user_idx
  on public.live_chat_abuse_identities(user_id, last_seen_at desc)
  where user_id is not null;
create index if not exists live_chat_abuse_token_idx
  on public.live_chat_abuse_identities(abuse_token_hash, last_seen_at desc)
  where abuse_token_hash is not null;
create index if not exists live_chat_abuse_ip_idx
  on public.live_chat_abuse_identities(ip_hash, last_seen_at desc)
  where ip_hash is not null;
create index if not exists live_chat_abuse_device_idx
  on public.live_chat_abuse_identities(device_profile_hash, last_seen_at desc)
  where device_profile_hash is not null;

create table if not exists public.live_chat_blocks (
  id uuid primary key default gen_random_uuid(),
  scope text not null default 'chat' check (scope in ('chat', 'site')),
  target_mode text not null default 'visitor_network'
    check (target_mode in ('visitor', 'visitor_network', 'site')),
  visitor_token uuid,
  user_id uuid references auth.users(id) on delete set null,
  abuse_token_hash text,
  ip_hash text,
  display_name_snapshot text,
  network_label text,
  reason text not null check (reason in (
    'spam', 'unnecessary_messages', 'harassment', 'fake_names',
    'video_abuse', 'other'
  )),
  admin_note text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  revoke_note text,
  constraint live_chat_block_has_signal check (
    visitor_token is not null or user_id is not null
    or abuse_token_hash is not null or ip_hash is not null
  ),
  constraint live_chat_site_block_strong_identity check (
    scope = 'chat'
    or user_id is not null
    or (visitor_token is not null and abuse_token_hash is not null)
  ),
  constraint live_chat_block_hash_format check (
    (abuse_token_hash is null or abuse_token_hash ~ '^[0-9a-f]{64}$')
    and (ip_hash is null or ip_hash ~ '^[0-9a-f]{64}$')
  ),
  constraint live_chat_block_expiry check (expires_at is null or expires_at > created_at)
);

create index if not exists live_chat_blocks_active_visitor_idx
  on public.live_chat_blocks(visitor_token, scope, created_at desc)
  where revoked_at is null;
create index if not exists live_chat_blocks_active_user_idx
  on public.live_chat_blocks(user_id, scope, created_at desc)
  where revoked_at is null and user_id is not null;
create index if not exists live_chat_blocks_active_abuse_idx
  on public.live_chat_blocks(abuse_token_hash, scope, created_at desc)
  where revoked_at is null and abuse_token_hash is not null;
create index if not exists live_chat_blocks_active_ip_idx
  on public.live_chat_blocks(ip_hash, scope, created_at desc)
  where revoked_at is null and ip_hash is not null;
create index if not exists live_chat_blocks_history_idx
  on public.live_chat_blocks(created_at desc);

-- Short-lived operational counters. Keys are HMAC-derived and cannot be
-- reversed into visitor tokens, abuse tokens or IP addresses.
create table if not exists public.live_chat_rate_limit_events (
  key_hash text not null check (key_hash ~ '^[0-9a-f]{64}$'),
  action text not null check (action in ('conversation_create', 'message_send', 'image_upload', 'video_request')),
  window_seconds integer not null check (window_seconds between 10 and 86400),
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0),
  violation_count integer not null default 0 check (violation_count >= 0),
  blocked_until timestamptz,
  updated_at timestamptz not null default now(),
  primary key (key_hash, action, window_seconds)
);

create index if not exists live_chat_rate_limit_retention_idx
  on public.live_chat_rate_limit_events(updated_at);

alter table public.live_chat_abuse_identities enable row level security;
alter table public.live_chat_abuse_identities force row level security;
alter table public.live_chat_blocks enable row level security;
alter table public.live_chat_blocks force row level security;
alter table public.live_chat_rate_limit_events enable row level security;
alter table public.live_chat_rate_limit_events force row level security;

revoke all on public.live_chat_abuse_identities from public, anon, authenticated;
revoke all on public.live_chat_blocks from public, anon, authenticated;
revoke all on public.live_chat_rate_limit_events from public, anon, authenticated;
grant select on public.live_chat_abuse_identities to authenticated;
grant select on public.live_chat_blocks to authenticated;

drop policy if exists "Admins read live chat abuse identities" on public.live_chat_abuse_identities;
create policy "Admins read live chat abuse identities"
on public.live_chat_abuse_identities for select to authenticated
using ((select public.current_user_is_admin()));

drop policy if exists "Admins read live chat blocks" on public.live_chat_blocks;
create policy "Admins read live chat blocks"
on public.live_chat_blocks for select to authenticated
using ((select public.current_user_is_admin()));

-- All customer mutations now pass through the server-side resolver. Visitor
-- reads, Realtime delivery and read receipts remain unchanged.
drop policy if exists "Visitors create own live chat" on public.live_chat_conversations;
drop policy if exists "Visitors send own chat messages" on public.live_chat_messages;
revoke insert on public.live_chat_conversations from anon;
revoke insert on public.live_chat_messages from anon;
drop policy if exists "Visitors upload own live chat images" on storage.objects;
drop policy if exists "Visitors remove failed live chat images" on storage.objects;

create or replace function public.consume_live_chat_rate_limit(
  p_action text,
  p_key_hashes text[],
  p_limit integer,
  p_window_seconds integer,
  p_cooldown_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_key text;
  v_row public.live_chat_rate_limit_events%rowtype;
  v_allowed boolean := true;
  v_retry_after integer := 0;
  v_cooldown integer;
begin
  if p_action not in ('conversation_create', 'message_send', 'image_upload', 'video_request')
    or coalesce(array_length(p_key_hashes, 1), 0) = 0
    or p_limit < 1 or p_limit > 5000
    or p_window_seconds < 10 or p_window_seconds > 86400
    or p_cooldown_seconds < 10 or p_cooldown_seconds > 604800 then
    return jsonb_build_object('allowed', false, 'retryAfter', 60, 'error', 'invalid_parameters');
  end if;

  for v_key in
    select distinct value
    from unnest(p_key_hashes) as value
    where value ~ '^[0-9a-f]{64}$'
    order by value
  loop
    perform pg_advisory_xact_lock(hashtextextended(p_action || ':' || p_window_seconds || ':' || v_key, 0));

    insert into public.live_chat_rate_limit_events (
      key_hash, action, window_seconds, window_started_at, request_count, updated_at
    ) values (v_key, p_action, p_window_seconds, now(), 1, now())
    on conflict (key_hash, action, window_seconds) do update set
      window_started_at = case
        when public.live_chat_rate_limit_events.window_started_at <= now() - make_interval(secs => p_window_seconds)
          then now()
        else public.live_chat_rate_limit_events.window_started_at
      end,
      request_count = case
        when public.live_chat_rate_limit_events.window_started_at <= now() - make_interval(secs => p_window_seconds)
          then 1
        else public.live_chat_rate_limit_events.request_count + 1
      end,
      violation_count = case
        when public.live_chat_rate_limit_events.updated_at <= now() - interval '24 hours'
          then 0
        else public.live_chat_rate_limit_events.violation_count
      end,
      updated_at = now()
    returning * into v_row;

    if v_row.blocked_until is not null and v_row.blocked_until > now() then
      v_allowed := false;
      v_retry_after := greatest(v_retry_after, ceil(extract(epoch from (v_row.blocked_until - now())))::integer);
    elsif v_row.request_count > p_limit then
      v_cooldown := least(p_cooldown_seconds * (1 << least(v_row.violation_count, 3)), 604800);
      update public.live_chat_rate_limit_events
      set violation_count = violation_count + 1,
          blocked_until = now() + make_interval(secs => v_cooldown),
          updated_at = now()
      where key_hash = v_key and action = p_action and window_seconds = p_window_seconds;
      v_allowed := false;
      v_retry_after := greatest(v_retry_after, v_cooldown);
    end if;
  end loop;

  delete from public.live_chat_rate_limit_events
  where updated_at < now() - interval '30 days';

  return jsonb_build_object('allowed', v_allowed, 'retryAfter', v_retry_after);
end;
$$;

revoke all on function public.consume_live_chat_rate_limit(text,text[],integer,integer,integer)
  from public, anon, authenticated;
grant execute on function public.consume_live_chat_rate_limit(text,text[],integer,integer,integer)
  to service_role;

create or replace function public.end_live_chat_calls_for_block(p_conversation_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  with ended as (
    update public.live_chat_calls
    set status = 'ended', ended_at = now(), ended_by = 'system',
        end_reason = 'chat_access_blocked', revision = revision + 1, updated_at = now()
    where conversation_id = p_conversation_id
      and status in ('requesting', 'ringing', 'accepted', 'connecting', 'connected', 'reconnecting')
    returning id, conversation_id
  ), events as (
    insert into public.live_chat_call_events (
      call_id, conversation_id, event_type, actor_role, metadata
    )
    select id, conversation_id, 'ended', 'system',
      jsonb_build_object('reason', 'chat_access_blocked')
    from ended
    returning 1
  )
  select count(*) into v_count from events;
  return coalesce(v_count, 0);
end;
$$;

revoke all on function public.end_live_chat_calls_for_block(uuid)
  from public, anon, authenticated;
grant execute on function public.end_live_chat_calls_for_block(uuid) to service_role;

create or replace function public.audit_live_chat_block_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_action text;
  v_email text;
begin
  if tg_op = 'INSERT' then
    v_actor := new.created_by;
    v_action := 'live_chat.block_created';
  elsif old.revoked_at is null and new.revoked_at is not null then
    v_actor := new.revoked_by;
    v_action := 'live_chat.block_revoked';
  else
    return new;
  end if;

  select email into v_email from auth.users where id = v_actor;
  insert into public.audit_logs (
    actor_user_id, actor_email, actor_role, action, entity_type, entity_id,
    entity_name, old_data, new_data, metadata
  ) values (
    v_actor, v_email, 'admin', v_action, 'live_chat_block', new.id::text,
    new.display_name_snapshot,
    case when tg_op = 'UPDATE' then jsonb_build_object('revoked_at', old.revoked_at) else null end,
    jsonb_build_object('scope', new.scope, 'target_mode', new.target_mode,
      'reason', new.reason, 'expires_at', new.expires_at, 'revoked_at', new.revoked_at),
    jsonb_strip_nulls(jsonb_build_object('network_label', new.network_label))
  );
  return new;
end;
$$;

revoke all on function public.audit_live_chat_block_change() from public, anon, authenticated;
drop trigger if exists audit_live_chat_blocks on public.live_chat_blocks;
create trigger audit_live_chat_blocks
after insert or update of revoked_at on public.live_chat_blocks
for each row execute function public.audit_live_chat_block_change();

comment on table public.live_chat_abuse_identities is
  'Minimum abuse-prevention observations: HMAC network/first-party tokens and coarse profile only. Accessible to admins; removed with the conversation.';
comment on table public.live_chat_blocks is
  'Auditable live-chat/site access blocks. Raw IP and raw abuse tokens are intentionally not stored; revoked rows are retained.';
comment on table public.live_chat_rate_limit_events is
  'HMAC-keyed operational counters with 30-day lazy retention; service-role only.';

commit;
