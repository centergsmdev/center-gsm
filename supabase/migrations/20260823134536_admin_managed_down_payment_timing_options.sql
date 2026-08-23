begin;

create or replace function public.valid_down_payment_timing_options(
  p_options jsonb
)
returns boolean
language sql
immutable
security invoker
set search_path = ''
as $$
  select case
    when p_options is null or jsonb_typeof(p_options) is distinct from 'array'
      then false
    when jsonb_array_length(p_options) not between 1 and 6
      then false
    else
      not exists (
        select 1
        from jsonb_array_elements(p_options) as option
        where jsonb_typeof(option) is distinct from 'object'
          or jsonb_typeof(option -> 'id') is distinct from 'string'
          or jsonb_typeof(option -> 'label') is distinct from 'string'
          or coalesce(option ->> 'id', '') !~ '^[a-z0-9_]{1,40}$'
          or option ->> 'id' = 'not_ready'
          or char_length(btrim(coalesce(option ->> 'label', ''))) not between 1 and 80
      )
      and (
        select count(*) = count(distinct option ->> 'id')
        from jsonb_array_elements(p_options) as option
      )
      and (
        select count(*) = count(distinct lower(btrim(option ->> 'label')))
        from jsonb_array_elements(p_options) as option
      )
  end;
$$;

revoke all on function public.valid_down_payment_timing_options(jsonb)
  from public, anon, authenticated, service_role;

alter table public.payment_plan_configurations
  add column down_payment_timing_options jsonb not null default
    '[{"id":"immediate","label":"Hemen ödeyebilirim"},{"id":"today_12_15","label":"Bugün 12.00–15.00 arasında"},{"id":"today_15_18","label":"Bugün 15.00–18.00 arasında"}]'::jsonb;

alter table public.payment_plan_configurations
  add constraint payment_plan_configurations_timing_options_check
  check (public.valid_down_payment_timing_options(down_payment_timing_options));

comment on column public.payment_plan_configurations.down_payment_timing_options is
  'Versioned admin-managed customer down-payment readiness choices.';

alter table public.installment_applications
  add column down_payment_timing_label text;

update public.installment_applications
set down_payment_timing_label = case down_payment_timing
  when 'immediate' then 'Hemen ödeyebilirim'
  when 'today_12_15' then 'Bugün 12.00–15.00 arasında'
  when 'today_15_18' then 'Bugün 15.00–18.00 arasında'
  else 'Peşinat ödeme zamanı seçildi'
end
where down_payment_timing is not null;

alter table public.installment_applications
  drop constraint installment_applications_down_payment_commitment_check;

alter table public.installment_applications
  add constraint installment_applications_down_payment_commitment_check
  check (
    (
      down_payment_timing is null
      and down_payment_timing_label is null
      and down_payment_timing_date is null
      and down_payment_timing_selected_at is null
    )
    or (
      down_payment_timing is not null
      and down_payment_timing ~ '^[a-z0-9_]{1,40}$'
      and down_payment_timing <> 'not_ready'
      and down_payment_timing_label is not null
      and char_length(btrim(down_payment_timing_label)) between 1 and 80
      and down_payment_timing_date is not null
      and down_payment_timing_selected_at is not null
    )
  );

comment on column public.installment_applications.down_payment_timing_label is
  'Immutable customer-visible label selected from the referenced payment configuration.';

create or replace function public.admin_create_payment_plan_configuration(
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
  v_actor uuid := auth.uid();
  v_old public.payment_plan_configurations%rowtype;
  v_new public.payment_plan_configurations%rowtype;
  v_revision integer;
begin
  if v_actor is null or not public.is_admin() then
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
    v_actor
  ) returning * into v_new;

  perform public.write_audit_log(
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
  bigint,integer,integer,integer,integer[],jsonb,integer,integer[]
) from public, anon, authenticated, service_role;
grant execute on function public.admin_create_payment_plan_configuration(
  bigint,integer,integer,integer,integer[],jsonb,integer,integer[]
) to authenticated;

revoke all on function public.admin_create_payment_plan_configuration(
  bigint,integer,integer,integer,integer[],integer,integer[]
) from public, anon, authenticated, service_role;
grant execute on function public.admin_create_payment_plan_configuration(
  bigint,integer,integer,integer,integer[],integer,integer[]
) to authenticated;

notify pgrst, 'reload schema';

commit;
