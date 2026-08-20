begin;

create table public.installment_applications (
  id uuid primary key default gen_random_uuid(),
  application_number text not null unique,
  idempotency_key_hash text not null unique,
  draft_token_hash text check (draft_token_hash is null or char_length(draft_token_hash) = 64),
  user_id uuid references auth.users(id) on update cascade on delete set null,
  applicant_name text not null check (char_length(applicant_name) between 2 and 120),
  phone_e164 text not null check (phone_e164 ~ '^\+905[0-9]{9}$'),
  email text check (email is null or char_length(email) <= 254),
  product_id uuid not null references public.products(id) on update cascade on delete restrict,
  variant_id uuid references public.product_variants(id) on update cascade on delete restrict,
  product_name_snapshot text not null,
  variant_title_snapshot text,
  sku_snapshot text not null,
  price_snapshot numeric(12,2) not null check (price_snapshot >= 0),
  image_url_snapshot text,
  color_snapshot text,
  storage_value_snapshot integer,
  storage_unit_snapshot text check (storage_unit_snapshot is null or storage_unit_snapshot in ('GB','TB')),
  status text not null default 'draft' check (status in ('draft','submitted','under_review','approved','rejected','cancelled')),
  revision integer not null default 1 check (revision > 0),
  submitted_at timestamptz,
  decision_at timestamptz,
  decision_by uuid references auth.users(id) on update cascade on delete set null,
  rejection_reason_public text check (rejection_reason_public is null or char_length(rejection_reason_public) <= 1000),
  internal_note text check (internal_note is null or char_length(internal_note) <= 2000),
  request_ip_hash text check (request_ip_hash is null or char_length(request_ip_hash) = 64),
  user_agent_summary text check (user_agent_summary is null or char_length(user_agent_summary) <= 300),
  retention_review_at timestamptz not null default (timezone('utc', now()) + interval '180 days'),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.installment_application_documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.installment_applications(id) on update cascade on delete cascade,
  document_type text not null check (document_type in ('identity_front','identity_back','residence','signature')),
  storage_path text not null unique,
  original_name text not null check (char_length(original_name) between 1 and 180),
  original_mime_type text not null,
  stored_mime_type text not null check (stored_mime_type in ('image/webp','application/pdf')),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 4194304),
  sha256 text not null check (char_length(sha256) = 64),
  width integer check (width is null or width between 1 and 12000),
  height integer check (height is null or height between 1 and 12000),
  created_at timestamptz not null default timezone('utc', now()),
  unique (application_id, document_type)
);

create table public.installment_application_consents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.installment_applications(id) on update cascade on delete cascade,
  consent_type text not null check (consent_type in ('privacy_notice_acknowledged','application_terms_acknowledged')),
  notice_version text not null check (char_length(notice_version) between 1 and 80),
  acknowledged_at timestamptz not null default timezone('utc', now()),
  unique (application_id, consent_type)
);

create table public.installment_application_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.installment_applications(id) on update cascade on delete cascade,
  event_type text not null check (event_type in (
    'application.created','application.submitted','application.review_started',
    'application.approved','application.rejected','application.cancelled',
    'application.status_changed','document.uploaded','document.viewed','document.downloaded'
  )),
  actor_type text not null check (actor_type in ('customer','admin','system')),
  actor_user_id uuid references auth.users(id) on update cascade on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.installment_rate_limits (
  key_hash text not null,
  action text not null check (action in ('draft','upload','submit')),
  window_started_at timestamptz not null,
  request_count integer not null default 1 check (request_count > 0),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (key_hash, action, window_started_at)
);

create index installment_applications_status_created_idx
  on public.installment_applications(status, created_at desc);
create index installment_applications_phone_idx
  on public.installment_applications(phone_e164);
create index installment_applications_name_idx
  on public.installment_applications(lower(applicant_name));
create index installment_applications_user_idx
  on public.installment_applications(user_id) where user_id is not null;
create index installment_applications_product_idx
  on public.installment_applications(product_id);
create index installment_applications_variant_idx
  on public.installment_applications(variant_id) where variant_id is not null;
create index installment_applications_decision_by_idx
  on public.installment_applications(decision_by) where decision_by is not null;
create index installment_events_application_created_idx
  on public.installment_application_events(application_id, created_at desc);
create index installment_events_actor_user_idx
  on public.installment_application_events(actor_user_id) where actor_user_id is not null;
create index installment_rate_limits_updated_idx
  on public.installment_rate_limits(updated_at);

create trigger set_installment_applications_updated_at
before update on public.installment_applications
for each row execute function public.set_updated_at();

alter table public.installment_applications enable row level security;
alter table public.installment_application_documents enable row level security;
alter table public.installment_application_consents enable row level security;
alter table public.installment_application_events enable row level security;
alter table public.installment_rate_limits enable row level security;

revoke all on public.installment_applications from public, anon, authenticated;
revoke all on public.installment_application_documents from public, anon, authenticated;
revoke all on public.installment_application_consents from public, anon, authenticated;
revoke all on public.installment_application_events from public, anon, authenticated;
revoke all on public.installment_rate_limits from public, anon, authenticated;

grant select, insert, update, delete on public.installment_applications to service_role;
grant select, insert, update on public.installment_application_documents to service_role;
grant select on public.installment_application_consents to service_role;
grant select, insert on public.installment_application_events to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'installment-private',
  'installment-private',
  false,
  4194304,
  array['image/webp','application/pdf']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.consume_installment_rate_limit(
  p_key_hash text,
  p_action text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window timestamptz;
  v_count integer;
begin
  if p_action is null or p_action not in ('draft','upload','submit')
    or p_limit < 1 or p_limit > 1000
    or p_window_seconds < 60 or p_window_seconds > 86400
    or char_length(p_key_hash) <> 64 then
    raise exception 'invalid_rate_limit_parameters';
  end if;

  v_window := to_timestamp(
    floor(extract(epoch from timezone('utc', now())) / p_window_seconds) * p_window_seconds
  );

  insert into public.installment_rate_limits(
    key_hash, action, window_started_at, request_count
  ) values (p_key_hash, p_action, v_window, 1)
  on conflict (key_hash, action, window_started_at) do update
  set request_count = public.installment_rate_limits.request_count + 1,
      updated_at = timezone('utc', now())
  where public.installment_rate_limits.request_count < p_limit
  returning request_count into v_count;

  return v_count is not null and v_count <= p_limit;
end;
$$;

revoke all on function public.consume_installment_rate_limit(text,text,integer,integer)
  from public, anon, authenticated;
grant execute on function public.consume_installment_rate_limit(text,text,integer,integer)
  to service_role;

create or replace function public.submit_installment_application(
  p_application_id uuid,
  p_draft_token_hash text,
  p_privacy_notice_version text,
  p_terms_version text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_application public.installment_applications%rowtype;
  v_document_count integer;
begin
  select * into v_application
  from public.installment_applications
  where id = p_application_id
  for update;

  if not found or v_application.draft_token_hash is distinct from p_draft_token_hash then
    raise exception 'application_not_found';
  end if;
  if v_application.status = 'submitted' then
    return jsonb_build_object(
      'id', v_application.id,
      'application_number', v_application.application_number,
      'status', v_application.status
    );
  end if;
  if v_application.status <> 'draft' then raise exception 'invalid_status'; end if;
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

  select count(distinct document_type) into v_document_count
  from public.installment_application_documents
  where application_id = p_application_id
    and document_type in ('identity_front','identity_back','residence','signature');
  if v_document_count <> 4 then raise exception 'documents_incomplete'; end if;
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

  update public.installment_applications
  set status = 'submitted',
      submitted_at = timezone('utc', now()),
      revision = revision + 1
  where id = p_application_id
  returning * into v_application;

  insert into public.installment_application_events(
    application_id, event_type, actor_type, metadata
  ) values (
    p_application_id,
    'application.submitted',
    'customer',
    jsonb_build_object('document_count', 4)
  );

  return jsonb_build_object(
    'id', v_application.id,
    'application_number', v_application.application_number,
    'status', v_application.status
  );
end;
$$;

revoke all on function public.submit_installment_application(uuid,text,text,text)
  from public, anon, authenticated;
grant execute on function public.submit_installment_application(uuid,text,text,text)
  to service_role;

create or replace function public.admin_transition_installment_application(
  p_application_id uuid,
  p_expected_revision integer,
  p_action text,
  p_public_reason text default null,
  p_internal_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_application public.installment_applications%rowtype;
  v_next_status text;
  v_event text;
begin
  if not public.is_admin() then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  if p_action is null or p_action not in ('review','approve','reject') then
    raise exception 'invalid_action';
  end if;

  select * into v_application
  from public.installment_applications
  where id = p_application_id
  for update;

  if not found then raise exception 'application_not_found'; end if;
  if v_application.revision <> p_expected_revision then
    raise exception 'revision_conflict';
  end if;
  if p_action = 'review' and v_application.status <> 'submitted' then
    raise exception 'invalid_status_transition';
  end if;
  if p_action in ('approve','reject') and v_application.status <> 'under_review' then
    raise exception 'review_required';
  end if;
  if p_action = 'reject' and char_length(coalesce(trim(p_public_reason), '')) < 3 then
    raise exception 'rejection_reason_required';
  end if;

  v_next_status := case p_action
    when 'review' then 'under_review'
    when 'approve' then 'approved'
    else 'rejected'
  end;
  v_event := case p_action
    when 'review' then 'application.review_started'
    when 'approve' then 'application.approved'
    else 'application.rejected'
  end;

  update public.installment_applications
  set status = v_next_status,
      revision = revision + 1,
      decision_at = case when p_action in ('approve','reject') then timezone('utc', now()) else decision_at end,
      decision_by = case when p_action in ('approve','reject') then auth.uid() else decision_by end,
      rejection_reason_public = case when p_action = 'reject' then left(trim(p_public_reason), 1000) else null end,
      internal_note = case
        when p_action in ('approve','reject') then nullif(left(trim(coalesce(p_internal_note, '')), 2000), '')
        else internal_note
      end
  where id = p_application_id
  returning * into v_application;

  insert into public.installment_application_events(
    application_id, event_type, actor_type, actor_user_id, metadata
  ) values (
    v_application.id,
    v_event,
    'admin',
    auth.uid(),
    jsonb_build_object('from_status', case when p_action = 'review' then 'submitted' else 'under_review' end, 'to_status', v_next_status)
  );

  perform public.write_audit_log(
    v_event,
    'installment_application',
    v_application.id::text,
    v_application.application_number,
    jsonb_build_object('status', case when p_action = 'review' then 'submitted' else 'under_review' end, 'revision', p_expected_revision),
    jsonb_build_object('status', v_next_status, 'revision', v_application.revision),
    jsonb_build_object('has_public_reason', p_action = 'reject', 'has_internal_note', nullif(trim(coalesce(p_internal_note, '')), '') is not null)
  );

  return jsonb_build_object(
    'id', v_application.id,
    'status', v_application.status,
    'revision', v_application.revision,
    'decision_at', v_application.decision_at
  );
end;
$$;

revoke all on function public.admin_transition_installment_application(uuid,integer,text,text,text)
  from public, anon;
grant execute on function public.admin_transition_installment_application(uuid,integer,text,text,text)
  to authenticated;

notify pgrst, 'reload schema';

commit;
