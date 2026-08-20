begin;

create or replace function public.valid_payment_installment_counts(p_counts integer[])
returns boolean
language sql
immutable
security invoker
set search_path = ''
as $$
  select coalesce(
    cardinality(p_counts) between 1 and 12
    and not exists (
      select 1 from unnest(p_counts) as value
      where value < 1 or value > 36
    )
    and cardinality(p_counts) = (
      select count(distinct value) from unnest(p_counts) as value
    ),
    false
  );
$$;

create or replace function public.valid_installment_payment_schedule(
  p_schedule jsonb,
  p_count integer,
  p_total_minor bigint
)
returns boolean
language plpgsql
immutable
security invoker
set search_path = ''
as $$
declare
  v_count integer;
  v_distinct integer;
  v_min integer;
  v_max integer;
  v_total numeric;
begin
  if jsonb_typeof(p_schedule) <> 'array'
    or p_count < 1
    or jsonb_array_length(p_schedule) <> p_count then
    return false;
  end if;
  select
    count(*),
    count(distinct (item ->> 'installment')::integer),
    min((item ->> 'installment')::integer),
    max((item ->> 'installment')::integer),
    sum((item ->> 'amount_minor')::numeric)
  into v_count, v_distinct, v_min, v_max, v_total
  from jsonb_array_elements(p_schedule) as item
  where jsonb_typeof(item) = 'object'
    and (item ->> 'installment') ~ '^[0-9]+$'
    and (item ->> 'amount_minor') ~ '^[0-9]+$';
  return v_count = p_count
    and v_distinct = p_count
    and v_min = 1
    and v_max = p_count
    and v_total = p_total_minor;
exception when others then
  return false;
end;
$$;

revoke all on function public.valid_payment_installment_counts(integer[])
  from public, anon, authenticated;
revoke all on function public.valid_installment_payment_schedule(jsonb,integer,bigint)
  from public, anon, authenticated;
grant execute on function public.valid_installment_payment_schedule(jsonb,integer,bigint)
  to service_role;

create table public.payment_plan_configurations (
  id uuid primary key default gen_random_uuid(),
  revision integer not null unique check (revision > 0),
  threshold_minor bigint not null check (
    threshold_minor >= 0 and threshold_minor <= 1000000000000
  ),
  above_threshold_down_payment_bps integer not null check (
    above_threshold_down_payment_bps between 0 and 10000
  ),
  below_threshold_down_payment_bps integer not null check (
    below_threshold_down_payment_bps between 0 and 10000
  ),
  installment_finance_charge_bps integer not null check (
    installment_finance_charge_bps between 0 and 10000
  ),
  installment_counts integer[] not null check (
    public.valid_payment_installment_counts(installment_counts)
  ),
  credit_card_finance_charge_bps integer not null check (
    credit_card_finance_charge_bps = 0
  ),
  credit_card_installment_counts integer[] not null check (
    public.valid_payment_installment_counts(credit_card_installment_counts)
  ),
  is_active boolean not null default false,
  created_by uuid references auth.users(id) on update cascade on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index payment_plan_configurations_one_active_idx
  on public.payment_plan_configurations (is_active) where is_active;
create index payment_plan_configurations_created_idx
  on public.payment_plan_configurations (created_at desc);
create index payment_plan_configurations_created_by_idx
  on public.payment_plan_configurations (created_by) where created_by is not null;

create or replace function public.protect_payment_plan_configuration()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then raise exception 'payment_config_immutable'; end if;
  if new.id is distinct from old.id
    or new.revision is distinct from old.revision
    or new.threshold_minor is distinct from old.threshold_minor
    or new.above_threshold_down_payment_bps is distinct from old.above_threshold_down_payment_bps
    or new.below_threshold_down_payment_bps is distinct from old.below_threshold_down_payment_bps
    or new.installment_finance_charge_bps is distinct from old.installment_finance_charge_bps
    or new.installment_counts is distinct from old.installment_counts
    or new.credit_card_finance_charge_bps is distinct from old.credit_card_finance_charge_bps
    or new.credit_card_installment_counts is distinct from old.credit_card_installment_counts
    or new.created_by is distinct from old.created_by
    or new.created_at is distinct from old.created_at then
    raise exception 'payment_config_immutable';
  end if;
  return new;
end;
$$;

create trigger protect_payment_plan_configuration
before update or delete on public.payment_plan_configurations
for each row execute function public.protect_payment_plan_configuration();

insert into public.payment_plan_configurations (
  revision,
  threshold_minor,
  above_threshold_down_payment_bps,
  below_threshold_down_payment_bps,
  installment_finance_charge_bps,
  installment_counts,
  credit_card_finance_charge_bps,
  credit_card_installment_counts,
  is_active
) values (
  1,
  7000000,
  1500,
  2000,
  500,
  array[3,6,9,12],
  0,
  array[3,6,9,12],
  true
);

create table public.installment_application_payment_plans (
  application_id uuid primary key references public.installment_applications(id)
    on update cascade on delete cascade,
  payment_type text not null check (payment_type = 'installment_application'),
  payment_config_id uuid not null references public.payment_plan_configurations(id)
    on update cascade on delete restrict,
  payment_config_revision integer not null check (payment_config_revision > 0),
  product_price_minor bigint not null check (product_price_minor >= 0),
  threshold_minor bigint not null check (threshold_minor >= 0),
  down_payment_rate_bps integer not null check (down_payment_rate_bps between 0 and 10000),
  down_payment_amount_minor bigint not null check (down_payment_amount_minor >= 0),
  remaining_principal_minor bigint not null check (remaining_principal_minor >= 0),
  finance_charge_rate_bps integer not null check (finance_charge_rate_bps between 0 and 10000),
  finance_charge_amount_minor bigint not null check (finance_charge_amount_minor >= 0),
  financed_total_minor bigint not null check (financed_total_minor >= 0),
  installment_count integer not null check (installment_count between 1 and 36),
  installment_schedule jsonb not null,
  total_payable_minor bigint not null check (total_payable_minor >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  check (down_payment_amount_minor + remaining_principal_minor = product_price_minor),
  check (remaining_principal_minor + finance_charge_amount_minor = financed_total_minor),
  check (down_payment_amount_minor + financed_total_minor = total_payable_minor),
  check (public.valid_installment_payment_schedule(
    installment_schedule,
    installment_count,
    financed_total_minor
  ))
);

create index installment_application_payment_plans_config_idx
  on public.installment_application_payment_plans(payment_config_id);

create or replace function public.protect_installment_application_payment_plan()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'payment_snapshot_immutable';
end;
$$;

create trigger protect_installment_application_payment_plan
before update or delete on public.installment_application_payment_plans
for each row execute function public.protect_installment_application_payment_plan();

alter table public.payment_plan_configurations enable row level security;
alter table public.payment_plan_configurations force row level security;
alter table public.installment_application_payment_plans enable row level security;
alter table public.installment_application_payment_plans force row level security;

revoke all on public.payment_plan_configurations
  from public, anon, authenticated, service_role;
revoke all on public.installment_application_payment_plans
  from public, anon, authenticated, service_role;
grant select on public.payment_plan_configurations to service_role;
grant select, insert on public.installment_application_payment_plans to service_role;

create or replace function public.admin_create_payment_plan_configuration(
  p_threshold_minor bigint,
  p_above_threshold_down_payment_bps integer,
  p_below_threshold_down_payment_bps integer,
  p_installment_finance_charge_bps integer,
  p_installment_counts integer[],
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
    or not public.valid_payment_installment_counts(p_credit_card_installment_counts) then
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
      'credit_card_finance_charge_bps', v_new.credit_card_finance_charge_bps,
      'credit_card_installment_counts', v_new.credit_card_installment_counts
    ),
    jsonb_build_object('old_revision', v_old.revision, 'new_revision', v_new.revision)
  );

  return jsonb_build_object('id', v_new.id, 'revision', v_new.revision);
end;
$$;

revoke all on function public.admin_create_payment_plan_configuration(
  bigint,integer,integer,integer,integer[],integer,integer[]
) from public, anon, service_role;
grant execute on function public.admin_create_payment_plan_configuration(
  bigint,integer,integer,integer,integer[],integer,integer[]
) to authenticated;

do $$
declare
  v_active public.installment_contract_templates%rowtype;
begin
  if not exists (
    select 1 from public.installment_contract_templates
    where version = 'v2-payment-plan-2026-08-20'
  ) then
    select * into v_active
    from public.installment_contract_templates
    where is_active
    for update;
    if not found then raise exception 'active_contract_required'; end if;
    update public.installment_contract_templates set is_active = false where is_active;
    insert into public.installment_contract_templates(
      title, version, content_html, is_active
    ) values (
      v_active.title,
      'v2-payment-plan-2026-08-20',
      v_active.content_html || '<h2>8. Kabul edilen ödeme planı</h2><ul><li><strong>Ürün fiyatı:</strong> {{product_price}}</li><li><strong>Peşinat oranı:</strong> {{down_payment_rate}}</li><li><strong>Peşinat:</strong> {{down_payment_amount}}</li><li><strong>Kalan ana tutar:</strong> {{remaining_principal}}</li><li><strong>Vade farkı oranı:</strong> {{finance_charge_rate}}</li><li><strong>Vade farkı:</strong> {{finance_charge_amount}}</li><li><strong>Taksit sayısı:</strong> {{installment_count}}</li><li><strong>Taksit planı:</strong> {{installment_schedule}}</li><li><strong>Toplam ödenecek tutar:</strong> {{total_payable}}</li></ul><p>Bu ödeme planı, sözleşme ve imza ile aynı başvuru kaydına değiştirilemez snapshot olarak bağlanır.</p>',
      true
    );
  end if;
end;
$$;

create or replace function public.submit_installment_application_v3(
  p_application_id uuid,
  p_draft_token_hash text,
  p_privacy_notice_version text,
  p_terms_version text,
  p_contract_accepted boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_application public.installment_applications%rowtype;
  v_contract public.installment_application_contracts%rowtype;
  v_payment public.installment_application_payment_plans%rowtype;
  v_config public.payment_plan_configurations%rowtype;
  v_document_count integer;
  v_signature_document_id uuid;
  v_accepted_at timestamptz;
  v_current_price_minor bigint;
  v_expected_down_payment_rate integer;
  v_expected_down_payment bigint;
  v_expected_finance_charge bigint;
begin
  if p_contract_accepted is not true then
    raise exception 'contract_acceptance_required';
  end if;

  select * into v_application
  from public.installment_applications
  where id = p_application_id
  for update;
  if not found or v_application.draft_token_hash is distinct from p_draft_token_hash then
    raise exception 'application_not_found';
  end if;

  select * into v_payment
  from public.installment_application_payment_plans
  where application_id = p_application_id
  for update;
  if not found then raise exception 'payment_snapshot_missing'; end if;

  select * into v_contract
  from public.installment_application_contracts
  where application_id = p_application_id
  for update;
  if not found then raise exception 'contract_snapshot_missing'; end if;

  if v_application.status = 'submitted'
    and v_contract.accepted_at is not null then
    return jsonb_build_object(
      'id', v_application.id,
      'application_number', v_application.application_number,
      'status', v_application.status,
      'payment_config_revision', v_payment.payment_config_revision,
      'installment_count', v_payment.installment_count,
      'contract_version', v_contract.contract_version,
      'contract_content_hash', v_contract.contract_content_hash
    );
  end if;
  if v_application.status <> 'draft' then raise exception 'invalid_status'; end if;
  if v_contract.accepted_at is not null then raise exception 'contract_already_accepted'; end if;

  select * into v_config
  from public.payment_plan_configurations
  where id = v_payment.payment_config_id
    and revision = v_payment.payment_config_revision;
  if not found then raise exception 'payment_config_mismatch'; end if;
  if not exists(select 1 from public.payment_plan_configurations where is_active) then
    raise exception 'payment_config_unavailable';
  end if;
  v_expected_down_payment_rate := case
    when v_payment.product_price_minor >= v_config.threshold_minor
    then v_config.above_threshold_down_payment_bps
    else v_config.below_threshold_down_payment_bps
  end;
  if v_payment.payment_type <> 'installment_application'
    or v_payment.threshold_minor <> v_config.threshold_minor
    or array_position(v_config.installment_counts, v_payment.installment_count) is null
    or v_payment.down_payment_rate_bps <> v_expected_down_payment_rate
    or v_payment.finance_charge_rate_bps <> v_config.installment_finance_charge_bps then
    raise exception 'payment_snapshot_mismatch';
  end if;

  if not exists(
    select 1 from public.products
    where id = v_application.product_id and is_active
  ) then raise exception 'inactive_product'; end if;
  if v_application.variant_id is null and exists(
    select 1 from public.product_variants
    where product_id = v_application.product_id and is_active
  ) then raise exception 'variant_required'; end if;
  if v_application.variant_id is not null and not exists(
    select 1 from public.product_variants
    where id = v_application.variant_id
      and product_id = v_application.product_id
      and is_active
  ) then raise exception 'invalid_variant'; end if;

  if v_application.variant_id is null then
    select round(price * 100)::bigint into v_current_price_minor
    from public.products where id = v_application.product_id;
  else
    select round(price * 100)::bigint into v_current_price_minor
    from public.product_variants where id = v_application.variant_id;
  end if;
  if v_current_price_minor is distinct from v_payment.product_price_minor
    or round(v_application.price_snapshot * 100)::bigint is distinct from v_payment.product_price_minor then
    raise exception 'payment_price_changed';
  end if;

  v_expected_down_payment := round(
    v_payment.product_price_minor::numeric * v_payment.down_payment_rate_bps / 10000
  )::bigint;
  v_expected_finance_charge := round(
    v_payment.remaining_principal_minor::numeric * v_payment.finance_charge_rate_bps / 10000
  )::bigint;
  if v_payment.down_payment_amount_minor <> v_expected_down_payment
    or v_payment.remaining_principal_minor <> v_payment.product_price_minor - v_expected_down_payment
    or v_payment.finance_charge_amount_minor <> v_expected_finance_charge
    or v_payment.financed_total_minor <> v_payment.remaining_principal_minor + v_expected_finance_charge
    or v_payment.total_payable_minor <> v_payment.down_payment_amount_minor + v_payment.financed_total_minor
    or not public.valid_installment_payment_schedule(
      v_payment.installment_schedule,
      v_payment.installment_count,
      v_payment.financed_total_minor
    ) then
    raise exception 'payment_calculation_mismatch';
  end if;

  if v_contract.contract_content_hash is distinct from encode(
    extensions.digest(v_contract.rendered_contract_content, 'sha256'), 'hex'
  ) then raise exception 'contract_hash_mismatch'; end if;
  if not exists(
    select 1 from public.installment_contract_templates
    where id = v_contract.contract_template_id
      and title = v_contract.contract_title
      and version = v_contract.contract_version
  ) then raise exception 'contract_template_mismatch'; end if;
  if not exists(select 1 from public.installment_contract_templates where is_active) then
    raise exception 'contract_unavailable';
  end if;

  select count(distinct document_type) into v_document_count
  from public.installment_application_documents
  where application_id = p_application_id
    and document_type in ('identity_front','identity_back','residence','signature');
  if v_document_count <> 4 then raise exception 'documents_incomplete'; end if;
  select id into v_signature_document_id
  from public.installment_application_documents
  where application_id = p_application_id and document_type = 'signature';
  if v_signature_document_id is null then raise exception 'signature_missing'; end if;
  if char_length(trim(p_privacy_notice_version)) < 1
    or char_length(trim(p_terms_version)) < 1 then
    raise exception 'consents_incomplete';
  end if;

  insert into public.installment_application_consents(
    application_id, consent_type, notice_version
  ) values
    (p_application_id, 'privacy_notice_acknowledged', left(trim(p_privacy_notice_version), 80)),
    (p_application_id, 'application_terms_acknowledged', left(trim(p_terms_version), 80))
  on conflict (application_id, consent_type) do nothing;

  v_accepted_at := timezone('utc', now());
  update public.installment_application_contracts
  set accepted_at = v_accepted_at,
      signature_document_id = v_signature_document_id
  where application_id = p_application_id
  returning * into v_contract;
  update public.installment_applications
  set status = 'submitted',
      submitted_at = v_accepted_at,
      revision = revision + 1
  where id = p_application_id
  returning * into v_application;

  insert into public.installment_application_events(
    application_id, event_type, actor_type, metadata
  ) values (
    p_application_id,
    'application.submitted',
    'customer',
    jsonb_build_object(
      'document_count', 4,
      'payment_config_id', v_payment.payment_config_id,
      'payment_config_revision', v_payment.payment_config_revision,
      'installment_count', v_payment.installment_count,
      'total_payable_minor', v_payment.total_payable_minor,
      'contract_template_id', v_contract.contract_template_id,
      'contract_version', v_contract.contract_version,
      'contract_content_hash', v_contract.contract_content_hash,
      'signature_document_id', v_contract.signature_document_id
    )
  );

  return jsonb_build_object(
    'id', v_application.id,
    'application_number', v_application.application_number,
    'status', v_application.status,
    'payment_config_revision', v_payment.payment_config_revision,
    'installment_count', v_payment.installment_count,
    'total_payable_minor', v_payment.total_payable_minor,
    'contract_version', v_contract.contract_version,
    'contract_content_hash', v_contract.contract_content_hash
  );
end;
$$;

revoke all on function public.submit_installment_application_v3(
  uuid,text,text,text,boolean
) from public, anon, authenticated;
grant execute on function public.submit_installment_application_v3(
  uuid,text,text,text,boolean
) to service_role;

notify pgrst, 'reload schema';

commit;
