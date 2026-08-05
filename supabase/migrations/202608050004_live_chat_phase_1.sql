begin;

create table if not exists public.live_chat_conversations (
  id uuid primary key default gen_random_uuid(),
  visitor_token uuid not null unique,
  customer_name text not null check (char_length(btrim(customer_name)) between 2 and 80),
  status text not null default 'open' check (status in ('open', 'closed')),
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.live_chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.live_chat_conversations(id) on delete cascade,
  sender text not null check (sender in ('customer', 'admin')),
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists live_chat_conversations_last_message_idx
  on public.live_chat_conversations (last_message_at desc);
create index if not exists live_chat_messages_conversation_created_idx
  on public.live_chat_messages (conversation_id, created_at);

alter table public.live_chat_conversations enable row level security;
alter table public.live_chat_messages enable row level security;

create or replace function public.live_chat_request_token()
returns uuid
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  request_token text;
begin
  request_token := coalesce(
    (current_setting('request.headers', true)::json ->> 'x-live-chat-token'),
    ''
  );
  if request_token = '' then return null; end if;
  return request_token::uuid;
exception when others then
  return null;
end;
$$;

revoke all on function public.live_chat_request_token() from public;
grant execute on function public.live_chat_request_token() to anon, authenticated;

drop policy if exists "Visitors create own live chat" on public.live_chat_conversations;
create policy "Visitors create own live chat"
on public.live_chat_conversations for insert to anon
with check (visitor_token = (select public.live_chat_request_token()));

drop policy if exists "Visitors read own live chat" on public.live_chat_conversations;
create policy "Visitors read own live chat"
on public.live_chat_conversations for select to anon
using (visitor_token = (select public.live_chat_request_token()));

drop policy if exists "Admins manage live chats" on public.live_chat_conversations;
create policy "Admins manage live chats"
on public.live_chat_conversations for all to authenticated
using ((select public.current_user_is_admin()))
with check ((select public.current_user_is_admin()));

drop policy if exists "Visitors read own chat messages" on public.live_chat_messages;
create policy "Visitors read own chat messages"
on public.live_chat_messages for select to anon
using (
  exists (
    select 1 from public.live_chat_conversations conversation
    where conversation.id = conversation_id
      and conversation.visitor_token = (select public.live_chat_request_token())
  )
);

drop policy if exists "Visitors send own chat messages" on public.live_chat_messages;
create policy "Visitors send own chat messages"
on public.live_chat_messages for insert to anon
with check (
  sender = 'customer'
  and exists (
    select 1 from public.live_chat_conversations conversation
    where conversation.id = conversation_id
      and conversation.visitor_token = (select public.live_chat_request_token())
      and conversation.status = 'open'
  )
);

drop policy if exists "Admins manage live chat messages" on public.live_chat_messages;
create policy "Admins manage live chat messages"
on public.live_chat_messages for all to authenticated
using ((select public.current_user_is_admin()))
with check ((select public.current_user_is_admin()));

create or replace function public.touch_live_chat_conversation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.live_chat_conversations
  set last_message_at = new.created_at, updated_at = now()
  where id = new.conversation_id;
  return new;
end;
$$;

revoke all on function public.touch_live_chat_conversation() from public, anon, authenticated;

drop trigger if exists touch_live_chat_conversation_on_message on public.live_chat_messages;
create trigger touch_live_chat_conversation_on_message
after insert on public.live_chat_messages
for each row execute function public.touch_live_chat_conversation();

grant select, insert on public.live_chat_conversations to anon;
grant select, insert, update, delete on public.live_chat_conversations to authenticated;
grant select, insert on public.live_chat_messages to anon;
grant select, insert, update, delete on public.live_chat_messages to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'live_chat_conversations'
  ) then
    alter publication supabase_realtime add table public.live_chat_conversations;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'live_chat_messages'
  ) then
    alter publication supabase_realtime add table public.live_chat_messages;
  end if;
end;
$$;

commit;
