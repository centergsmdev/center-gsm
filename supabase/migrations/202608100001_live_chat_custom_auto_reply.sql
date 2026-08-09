begin;

alter table public.live_chat_settings
  add column if not exists auto_reply_message text;

update public.live_chat_settings
set auto_reply_message =
  'Şu anda işlem yoğunluğu nedeniyle sizi kısa süre bekleteceğim. Birazdan yanıt alacaksınız.'
where auto_reply_message is null
   or btrim(auto_reply_message) = '';

alter table public.live_chat_settings
  alter column auto_reply_message set default
    'Şu anda işlem yoğunluğu nedeniyle sizi kısa süre bekleteceğim. Birazdan yanıt alacaksınız.',
  alter column auto_reply_message set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'live_chat_settings_auto_reply_message_length_check'
      and conrelid = 'public.live_chat_settings'::regclass
  ) then
    alter table public.live_chat_settings
      add constraint live_chat_settings_auto_reply_message_length_check
      check (char_length(btrim(auto_reply_message)) between 1 and 500);
  end if;
end
$$;

commit;
