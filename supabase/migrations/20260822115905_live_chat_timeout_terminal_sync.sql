create extension if not exists pg_cron;

alter table public.live_chat_video_settings
  alter column ring_timeout_seconds set default 30;

update public.live_chat_video_settings
set ring_timeout_seconds = 30,
    updated_at = now()
where id = true
  and ring_timeout_seconds is distinct from 30;

create or replace function public.broadcast_live_chat_call_state()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_visitor_token text;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  select conversation.visitor_token::text
  into v_visitor_token
  from public.live_chat_conversations conversation
  where conversation.id = new.conversation_id;

  if v_visitor_token is not null then
    perform realtime.send(
      jsonb_build_object(
        'conversationId', new.conversation_id,
        'callId', new.id,
        'status', new.status
      ),
      'call_timeline',
      'live-chat:' || v_visitor_token,
      false
    );
  end if;

  return new;
end;
$$;

revoke all on function public.broadcast_live_chat_call_state()
from public, anon, authenticated;

drop trigger if exists broadcast_live_chat_call_state
on public.live_chat_calls;

create trigger broadcast_live_chat_call_state
after update of status on public.live_chat_calls
for each row
when (old.status is distinct from new.status)
execute function public.broadcast_live_chat_call_state();

select cron.unschedule(jobid)
from cron.job
where jobname = 'center-gsm-expire-live-chat-calls';

select cron.schedule(
  'center-gsm-expire-live-chat-calls',
  '1 second',
  $cron$select public.expire_live_chat_calls();$cron$
);
