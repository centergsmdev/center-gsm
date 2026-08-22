begin;

-- Remove historical broad anon grants. Customer writes already pass through
-- the server service boundary; visitors keep only ownership-scoped reads and
-- the existing read receipt column update.
revoke all on public.live_chat_conversations from anon;
revoke all on public.live_chat_messages from anon;
grant select on public.live_chat_conversations to anon;
grant select on public.live_chat_messages to anon;
grant update (read_at) on public.live_chat_messages to anon;

-- An explicit service-only policy documents the intended owner of the
-- operational counter table and prevents an RLS-without-policy ambiguity.
drop policy if exists "Service role manages live chat rate limits"
  on public.live_chat_rate_limit_events;
create policy "Service role manages live chat rate limits"
on public.live_chat_rate_limit_events for all to service_role
using (true)
with check (true);

grant select, insert, update, delete on public.live_chat_rate_limit_events to service_role;
grant select, insert, update, delete on public.live_chat_abuse_identities to service_role;
grant select, insert, update, delete on public.live_chat_blocks to service_role;

commit;
