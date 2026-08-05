begin;

alter table public.live_chat_conversations
  add column if not exists ai_active boolean not null default true;

alter table public.live_chat_messages
  drop constraint if exists live_chat_messages_sender_check;

alter table public.live_chat_messages
  add constraint live_chat_messages_sender_check
  check (sender in ('customer', 'admin', 'ai'));

alter table public.live_chat_messages
  add column if not exists reply_to_message_id uuid
  references public.live_chat_messages(id) on delete set null;

create unique index if not exists live_chat_ai_reply_once_idx
  on public.live_chat_messages (reply_to_message_id)
  where sender = 'ai' and reply_to_message_id is not null;

create table if not exists public.live_chat_settings (
  id boolean primary key default true check (id = true),
  ai_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.live_chat_settings (id, ai_enabled)
values (true, true)
on conflict (id) do nothing;

alter table public.live_chat_settings enable row level security;

drop policy if exists "Admins manage live chat settings" on public.live_chat_settings;
create policy "Admins manage live chat settings"
on public.live_chat_settings for all to authenticated
using ((select public.current_user_is_admin()))
with check ((select public.current_user_is_admin()));

grant select, insert, update on public.live_chat_settings to authenticated;

drop policy if exists "Visitors mark admin chat messages read" on public.live_chat_messages;
drop policy if exists "Visitors mark support chat messages read" on public.live_chat_messages;
create policy "Visitors mark support chat messages read"
on public.live_chat_messages for update to anon
using (
  sender in ('admin', 'ai')
  and exists (
    select 1 from public.live_chat_conversations conversation
    where conversation.id = conversation_id
      and conversation.visitor_token = (select public.live_chat_request_token())
  )
)
with check (
  sender in ('admin', 'ai')
  and exists (
    select 1 from public.live_chat_conversations conversation
    where conversation.id = conversation_id
      and conversation.visitor_token = (select public.live_chat_request_token())
  )
);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'live_chat_settings'
  ) then
    alter publication supabase_realtime add table public.live_chat_settings;
  end if;
end;
$$;

commit;
