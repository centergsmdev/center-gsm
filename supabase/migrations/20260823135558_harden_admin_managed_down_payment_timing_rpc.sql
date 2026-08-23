begin;

create or replace function public.admin_create_payment_plan_configuration(
  p_actor_user_id uuid,
  p_threshold_minor bigint,
  p_above_threshold_down_payment_bps integer,
  p_below_threshold_down_payment_bps integer,
  p_installment_finance_charge_bps integer,
  p_installment_counts integer[],
  p_down_payment_timing_options jsonb,
  p_credit_card_finance_charge_bps integer,
  p_credit_card_installment_counts integer[]
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_email text;
  v_actor_role text;
  v_old public.payment_plan_configurations%rowtype;
  v_new public.payment_plan_configurations%rowtype;
  v_revision integer;
begin
  select u.email, u.raw_app_meta_data ->> 'role'
  into v_actor_email, v_actor_role
  from auth.users as u
  where u.id = p_actor_user_id;
  if v_actor_role is distinct from 'admin' then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  if p_threshold_minor < 0 or p_threshold_minor > 1000000000000
    or p_above_threshold_down_payment_bps not between 0 and 10000
    or p_below_threshold_down_payment_bps not between 0 and 10000
    or p_installment_finance_charge_bps not between 0 and 10000
    or p_credit_card_finance_charge_bps <> 0
    or not public.valid_payment_installment_counts(p_installment_counts)
    or not public.valid_payment_installment_counts(p_credit_card_installment_counts)
    or not public.valid_down_payment_timing_options(p_down_payment_timing_options) then
    raise exception 'invalid_payment_configuration' using errcode = '22023';
  end if;

  lock table public.payment_plan_configurations in exclusive mode;
  select * into v_old
  from public.payment_plan_configurations
  where is_active
  for update;
  select coalesce(max(revision), 0) + 1 into v_revision
  from public.payment_plan_configurations;

  update public.payment_plan_configurations set is_active = false where is_active;
  insert into public.payment_plan_configurations (
    revision,
    threshold_minor,
    above_threshold_down_payment_bps,
    below_threshold_down_payment_bps,
    installment_finance_charge_bps,
    installment_counts,
    down_payment_timing_options,
    credit_card_finance_charge_bps,
    credit_card_installment_counts,
    is_active,
    created_by
  ) values (
    v_revision,
    p_threshold_minor,
    p_above_threshold_down_payment_bps,
    p_below_threshold_down_payment_bps,
    p_installment_finance_charge_bps,
    p_installment_counts,
    p_down_payment_timing_options,
    p_credit_card_finance_charge_bps,
    p_credit_card_installment_counts,
    true,
    p_actor_user_id
  ) returning * into v_new;

  insert into public.audit_logs (
    actor_user_id,
    actor_email,
    actor_role,
    action,
    entity_type,
    entity_id,
    entity_name,
    old_data,
    new_data,
    metadata
  ) values (
    p_actor_user_id,
    v_actor_email,
    v_actor_role,
    'payment_settings.updated',
    'settings',
    v_new.id::text,
    'Ödeme Planı Ayarları',
    case when v_old.id is null then null else jsonb_build_object(
      'revision', v_old.revision,
      'threshold_minor', v_old.threshold_minor,
      'above_threshold_down_payment_bps', v_old.above_threshold_down_payment_bps,
      'below_threshold_down_payment_bps', v_old.below_threshold_down_payment_bps,
      'installment_finance_charge_bps', v_old.installment_finance_charge_bps,
      'installment_counts', v_old.installment_counts,
      'down_payment_timing_options', v_old.down_payment_timing_options,
      'credit_card_finance_charge_bps', v_old.credit_card_finance_charge_bps,
      'credit_card_installment_counts', v_old.credit_card_installment_counts
    ) end,
    jsonb_build_object(
      'revision', v_new.revision,
      'threshold_minor', v_new.threshold_minor,
      'above_threshold_down_payment_bps', v_new.above_threshold_down_payment_bps,
      'below_threshold_down_payment_bps', v_new.below_threshold_down_payment_bps,
      'installment_finance_charge_bps', v_new.installment_finance_charge_bps,
      'installment_counts', v_new.installment_counts,
      'down_payment_timing_options', v_new.down_payment_timing_options,
      'credit_card_finance_charge_bps', v_new.credit_card_finance_charge_bps,
      'credit_card_installment_counts', v_new.credit_card_installment_counts
    ),
    jsonb_build_object('old_revision', v_old.revision, 'new_revision', v_new.revision)
  );

  return jsonb_build_object('id', v_new.id, 'revision', v_new.revision);
end;
$$;

revoke all on function public.admin_create_payment_plan_configuration(
  uuid,bigint,integer,integer,integer,integer[],jsonb,integer,integer[]
) from public, anon, authenticated, service_role;
grant execute on function public.admin_create_payment_plan_configuration(
  uuid,bigint,integer,integer,integer,integer[],jsonb,integer,integer[]
) to service_role;

revoke all on function public.admin_create_payment_plan_configuration(
  bigint,integer,integer,integer,integer[],jsonb,integer,integer[]
) from public, anon, authenticated, service_role;
drop function public.admin_create_payment_plan_configuration(
  bigint,integer,integer,integer,integer[],jsonb,integer,integer[]
);

notify pgrst, 'reload schema';

commit;
