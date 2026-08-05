begin;

alter table public.live_chat_messages
  add column if not exists attachment_path text,
  add column if not exists attachment_name text,
  add column if not exists attachment_mime text,
  add column if not exists read_at timestamptz;

create index if not exists live_chat_messages_unread_idx
  on public.live_chat_messages (conversation_id, sender, read_at);

drop policy if exists "Visitors mark admin chat messages read" on public.live_chat_messages;
create policy "Visitors mark admin chat messages read"
on public.live_chat_messages for update to anon
using (
  sender = 'admin'
  and exists (
    select 1 from public.live_chat_conversations conversation
    where conversation.id = conversation_id
      and conversation.visitor_token = (select public.live_chat_request_token())
  )
)
with check (
  sender = 'admin'
  and exists (
    select 1 from public.live_chat_conversations conversation
    where conversation.id = conversation_id
      and conversation.visitor_token = (select public.live_chat_request_token())
  )
);

grant update (read_at) on public.live_chat_messages to anon;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'live-chat-images',
  'live-chat-images',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Visitors upload own live chat images" on storage.objects;
create policy "Visitors upload own live chat images"
on storage.objects for insert to anon
with check (
  bucket_id = 'live-chat-images'
  and (storage.foldername(name))[1] = (select public.live_chat_request_token())::text
);

drop policy if exists "Visitors read own live chat images" on storage.objects;
create policy "Visitors read own live chat images"
on storage.objects for select to anon
using (
  bucket_id = 'live-chat-images'
  and (storage.foldername(name))[1] = (select public.live_chat_request_token())::text
);

drop policy if exists "Visitors remove failed live chat images" on storage.objects;
create policy "Visitors remove failed live chat images"
on storage.objects for delete to anon
using (
  bucket_id = 'live-chat-images'
  and (storage.foldername(name))[1] = (select public.live_chat_request_token())::text
);

drop policy if exists "Admins read live chat images" on storage.objects;
create policy "Admins read live chat images"
on storage.objects for select to authenticated
using (
  bucket_id = 'live-chat-images'
  and (select public.current_user_is_admin())
);

commit;
