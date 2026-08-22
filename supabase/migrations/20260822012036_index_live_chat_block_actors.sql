begin;

create index if not exists live_chat_blocks_created_by_idx
  on public.live_chat_blocks(created_by);
create index if not exists live_chat_blocks_revoked_by_idx
  on public.live_chat_blocks(revoked_by)
  where revoked_by is not null;

commit;
