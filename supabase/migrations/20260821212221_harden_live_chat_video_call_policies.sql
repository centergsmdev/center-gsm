begin;

create index if not exists live_chat_call_events_call_id_idx
  on public.live_chat_call_events (call_id);

create index if not exists live_chat_video_settings_updated_by_idx
  on public.live_chat_video_settings (updated_by);

drop policy if exists "Call participants read authorized live chat call" on public.live_chat_calls;
create policy "Call participants read authorized live chat call"
on public.live_chat_calls for select to authenticated
using (
  (select public.current_user_is_admin())
  or (
    id::text = coalesce(
      nullif((select current_setting('request.jwt.claims', true)), '')::jsonb ->> 'call_id',
      ''
    )
    and signaling_nonce::text = coalesce(
      nullif((select current_setting('request.jwt.claims', true)), '')::jsonb ->> 'call_nonce',
      ''
    )
    and auth_expires_at > now()
  )
);

drop policy if exists "Call participants read authorized live chat call events" on public.live_chat_call_events;
create policy "Call participants read authorized live chat call events"
on public.live_chat_call_events for select to authenticated
using (
  (select public.current_user_is_admin())
  or exists (
    select 1
    from public.live_chat_calls call
    where call.id = live_chat_call_events.call_id
      and call.id::text = coalesce(
        nullif((select current_setting('request.jwt.claims', true)), '')::jsonb ->> 'call_id',
        ''
      )
      and call.signaling_nonce::text = coalesce(
        nullif((select current_setting('request.jwt.claims', true)), '')::jsonb ->> 'call_nonce',
        ''
      )
      and call.auth_expires_at > now()
  )
);

drop policy if exists "Clients cannot access live chat call rate limits"
  on public.live_chat_call_rate_limits;
create policy "Clients cannot access live chat call rate limits"
on public.live_chat_call_rate_limits for all to anon, authenticated
using (false)
with check (false);

commit;
