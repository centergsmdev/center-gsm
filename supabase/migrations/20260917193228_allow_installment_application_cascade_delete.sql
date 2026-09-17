begin;

-- Payment-plan snapshots remain immutable while their application exists.
-- The foreign-key cascade may remove the snapshot only after the parent
-- application row has already been deleted by the protected admin flow.
create or replace function public.protect_installment_application_payment_plan()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'DELETE'
    and pg_trigger_depth() > 1
    and not exists (
      select 1
      from public.installment_applications
      where id = old.application_id
    )
  then
    return old;
  end if;

  raise exception 'payment_snapshot_immutable';
end;
$$;

comment on function public.protect_installment_application_payment_plan() is
  'Keeps payment snapshots immutable but permits parent-application FK cascade deletion.';

commit;
