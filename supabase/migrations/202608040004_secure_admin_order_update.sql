begin;

revoke all on function public.admin_update_order(uuid, text, text, text, boolean) from anon;

commit;
