begin;

revoke all on function public.admin_create_payment_plan_configuration(
  bigint,integer,integer,integer,integer[],integer,integer[]
) from public, anon, authenticated, service_role;
drop function public.admin_create_payment_plan_configuration(
  bigint,integer,integer,integer,integer[],integer,integer[]
);

notify pgrst, 'reload schema';

commit;
