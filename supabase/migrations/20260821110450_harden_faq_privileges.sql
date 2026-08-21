begin;

revoke all on public.faq_items from anon, authenticated;
grant select on public.faq_items to anon, authenticated;
grant insert, update, delete on public.faq_items to authenticated;
grant select, insert, update, delete on public.faq_items to service_role;

commit;
