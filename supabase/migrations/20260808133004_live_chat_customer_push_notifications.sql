begin;

create table if not exists public.live_chat_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.live_chat_conversations(id) on delete cascade,
  visitor_token uuid not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint live_chat_push_subscription_owner_fk
    foreign key (visitor_token)
    references public.live_chat_conversations(visitor_token)
    on delete cascade
);

create index if not exists live_chat_push_subscriptions_conversation_idx
  on public.live_chat_push_subscriptions (conversation_id);

alter table public.live_chat_push_subscriptions enable row level security;
revoke all on public.live_chat_push_subscriptions from public, anon, authenticated;
grant select, insert, update, delete on public.live_chat_push_subscriptions to service_role;

commit;
