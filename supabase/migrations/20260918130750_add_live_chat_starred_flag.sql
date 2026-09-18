alter table public.live_chat_conversations
  add column if not exists is_starred boolean not null default false;

comment on column public.live_chat_conversations.is_starred is
  'Admin-only visual reminder for important live support conversations.';
