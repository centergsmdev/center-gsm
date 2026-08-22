begin;

alter table public.live_chat_video_settings
  drop constraint if exists live_chat_video_settings_avatar_mode_check;
alter table public.live_chat_video_settings
  add constraint live_chat_video_settings_avatar_mode_check
  check (avatar_mode in ('static', 'audio-reactive', 'simli-trinity'));

alter table public.live_chat_calls
  add column if not exists simli_session_state text,
  add column if not exists simli_session_attempt_id uuid,
  add column if not exists simli_session_started_at timestamptz,
  add column if not exists simli_session_ended_at timestamptz,
  add column if not exists simli_session_expires_at timestamptz;

alter table public.live_chat_calls
  drop constraint if exists live_chat_calls_simli_session_state_check;
alter table public.live_chat_calls
  add constraint live_chat_calls_simli_session_state_check
  check (
    simli_session_state is null
    or simli_session_state in ('reserved', 'active', 'ended', 'failed')
  );

create or replace function public.reserve_live_chat_simli_session(
  p_call_id uuid,
  p_attempt_id uuid,
  p_lease_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_call public.live_chat_calls%rowtype;
begin
  if p_call_id is null or p_attempt_id is null
    or p_lease_seconds < 15 or p_lease_seconds > 120 then
    return jsonb_build_object('ok', false, 'error', 'invalid_parameters');
  end if;

  select * into v_call
  from public.live_chat_calls
  where id = p_call_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'call_not_found');
  end if;
  if v_call.status not in ('accepted', 'connecting', 'connected', 'reconnecting')
    or v_call.accepted_by is null
    or v_call.auth_expires_at <= now() then
    return jsonb_build_object('ok', false, 'error', 'call_not_active');
  end if;
  if v_call.simli_session_attempt_id = p_attempt_id
    and v_call.simli_session_state in ('reserved', 'active')
    and v_call.simli_session_expires_at > now() then
    return jsonb_build_object('ok', true, 'attemptId', p_attempt_id, 'reused', true);
  end if;
  if v_call.simli_session_state in ('reserved', 'active')
    and v_call.simli_session_expires_at > now() then
    return jsonb_build_object('ok', false, 'error', 'session_already_active');
  end if;

  update public.live_chat_calls
  set simli_session_state = 'reserved',
      simli_session_attempt_id = p_attempt_id,
      simli_session_started_at = null,
      simli_session_ended_at = null,
      simli_session_expires_at = now() + make_interval(secs => p_lease_seconds),
      updated_at = now()
  where id = p_call_id;

  return jsonb_build_object('ok', true, 'attemptId', p_attempt_id, 'reused', false);
end;
$$;

create or replace function public.touch_live_chat_simli_session(
  p_call_id uuid,
  p_attempt_id uuid,
  p_lease_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated integer;
begin
  if p_call_id is null or p_attempt_id is null
    or p_lease_seconds < 15 or p_lease_seconds > 120 then
    return jsonb_build_object('ok', false, 'error', 'invalid_parameters');
  end if;

  update public.live_chat_calls
  set simli_session_state = 'active',
      simli_session_started_at = coalesce(simli_session_started_at, now()),
      simli_session_expires_at = now() + make_interval(secs => p_lease_seconds),
      updated_at = now()
  where id = p_call_id
    and simli_session_attempt_id = p_attempt_id
    and simli_session_state in ('reserved', 'active')
    and status in ('accepted', 'connecting', 'connected', 'reconnecting')
    and auth_expires_at > now();
  get diagnostics v_updated = row_count;

  return case when v_updated = 1
    then jsonb_build_object('ok', true)
    else jsonb_build_object('ok', false, 'error', 'session_not_active')
  end;
end;
$$;

create or replace function public.release_live_chat_simli_session(
  p_call_id uuid,
  p_attempt_id uuid,
  p_failed boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated integer;
begin
  update public.live_chat_calls
  set simli_session_state = case when p_failed then 'failed' else 'ended' end,
      simli_session_ended_at = now(),
      simli_session_expires_at = now(),
      updated_at = now()
  where id = p_call_id
    and simli_session_attempt_id = p_attempt_id
    and simli_session_state in ('reserved', 'active');
  get diagnostics v_updated = row_count;
  return jsonb_build_object('ok', v_updated = 1);
end;
$$;

create or replace function public.cleanup_live_chat_simli_session_on_call_end()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status in ('ended', 'rejected', 'missed', 'failed')
    and old.status is distinct from new.status
    and new.simli_session_state in ('reserved', 'active') then
    new.simli_session_state := case when new.status = 'failed' then 'failed' else 'ended' end;
    new.simli_session_ended_at := now();
    new.simli_session_expires_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists cleanup_live_chat_simli_session_on_call_end
  on public.live_chat_calls;
create trigger cleanup_live_chat_simli_session_on_call_end
before update of status on public.live_chat_calls
for each row execute function public.cleanup_live_chat_simli_session_on_call_end();

revoke all on function public.reserve_live_chat_simli_session(uuid,uuid,integer)
  from public, anon, authenticated;
revoke all on function public.touch_live_chat_simli_session(uuid,uuid,integer)
  from public, anon, authenticated;
revoke all on function public.release_live_chat_simli_session(uuid,uuid,boolean)
  from public, anon, authenticated;
grant execute on function public.reserve_live_chat_simli_session(uuid,uuid,integer)
  to service_role;
grant execute on function public.touch_live_chat_simli_session(uuid,uuid,integer)
  to service_role;
grant execute on function public.release_live_chat_simli_session(uuid,uuid,boolean)
  to service_role;

revoke all on function public.cleanup_live_chat_simli_session_on_call_end()
  from public, anon, authenticated;

commit;
