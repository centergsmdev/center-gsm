begin;

create table public.installment_contract_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 3 and 160),
  version text not null unique check (
    char_length(version) between 1 and 40
    and version ~ '^[A-Za-z0-9][A-Za-z0-9._-]*$'
  ),
  content_html text not null check (char_length(content_html) between 100 and 100000),
  content_sha256 text generated always as (
    encode(extensions.digest(content_html, 'sha256'), 'hex')
  ) stored,
  is_active boolean not null default false,
  created_by uuid references auth.users(id) on update cascade on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index installment_contract_templates_one_active_idx
  on public.installment_contract_templates (is_active)
  where is_active;
create index installment_contract_templates_created_idx
  on public.installment_contract_templates (created_at desc);
create index installment_contract_templates_created_by_idx
  on public.installment_contract_templates (created_by)
  where created_by is not null;

create table public.installment_application_contracts (
  application_id uuid primary key references public.installment_applications(id)
    on update cascade on delete cascade,
  contract_template_id uuid not null references public.installment_contract_templates(id)
    on update cascade on delete restrict,
  contract_title text not null check (char_length(contract_title) between 3 and 160),
  contract_version text not null check (char_length(contract_version) between 1 and 40),
  rendered_contract_content text not null check (
    char_length(rendered_contract_content) between 100 and 120000
  ),
  contract_content_hash text generated always as (
    encode(extensions.digest(rendered_contract_content, 'sha256'), 'hex')
  ) stored,
  presented_at timestamptz not null,
  accepted_at timestamptz,
  signature_document_id uuid unique references public.installment_application_documents(id)
    on update cascade on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  check (
    (accepted_at is null and signature_document_id is null)
    or (accepted_at is not null and signature_document_id is not null and accepted_at >= presented_at)
  )
);

create index installment_application_contracts_template_idx
  on public.installment_application_contracts (contract_template_id);
create index installment_application_contracts_accepted_idx
  on public.installment_application_contracts (accepted_at desc)
  where accepted_at is not null;

create trigger set_installment_contract_templates_updated_at
before update on public.installment_contract_templates
for each row execute function public.set_updated_at();

create or replace function public.protect_installment_contract_template_version()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.title is distinct from old.title
    or new.version is distinct from old.version
    or new.content_html is distinct from old.content_html
    or new.created_by is distinct from old.created_by
    or new.created_at is distinct from old.created_at then
    raise exception 'contract_template_immutable';
  end if;
  return new;
end;
$$;

create trigger protect_installment_contract_template_version
before update on public.installment_contract_templates
for each row execute function public.protect_installment_contract_template_version();

create or replace function public.protect_installment_application_contract_snapshot()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.application_id is distinct from old.application_id
    or new.contract_template_id is distinct from old.contract_template_id
    or new.contract_title is distinct from old.contract_title
    or new.contract_version is distinct from old.contract_version
    or new.rendered_contract_content is distinct from old.rendered_contract_content
    or new.presented_at is distinct from old.presented_at
    or new.created_at is distinct from old.created_at then
    raise exception 'contract_snapshot_immutable';
  end if;
  if old.accepted_at is not null and (
    new.accepted_at is distinct from old.accepted_at
    or new.signature_document_id is distinct from old.signature_document_id
  ) then
    raise exception 'contract_acceptance_immutable';
  end if;
  if old.accepted_at is null and new.accepted_at is not null
    and new.signature_document_id is null then
    raise exception 'signature_required_for_contract';
  end if;
  return new;
end;
$$;

create trigger protect_installment_application_contract_snapshot
before update on public.installment_application_contracts
for each row execute function public.protect_installment_application_contract_snapshot();

alter table public.installment_contract_templates enable row level security;
alter table public.installment_contract_templates force row level security;
alter table public.installment_application_contracts enable row level security;
alter table public.installment_application_contracts force row level security;

revoke all on public.installment_contract_templates from public, anon, authenticated;
revoke all on public.installment_application_contracts from public, anon, authenticated;
grant select, insert, update on public.installment_contract_templates to service_role;
grant select, insert on public.installment_application_contracts to service_role;

insert into public.installment_contract_templates (
  title,
  version,
  content_html,
  is_active
)
select
  'Elden Taksitli Satış Sözleşmesi',
  'v1-2026-08-20',
  '<h2>1. Taraflar ve sözleşmenin amacı</h2><p>Bu sözleşme, CENTER GSM ile <strong>{{customer_name}}</strong> arasında, aşağıda bilgileri yer alan ürün için yapılan elden taksit başvurusunun değerlendirme koşullarını ve müşterinin başvuru anında kabul ettiği metni kayıt altına alır.</p><p>Bu sözleşmenin başvuru aşamasında kabul edilmesi, başvurunun otomatik olarak onaylandığı, sipariş oluşturulduğu veya satışın kesinleştiği anlamına gelmez.</p><h2>2. Başvuru ve ürün bilgileri</h2><ul><li><strong>Başvuru sahibi:</strong> {{customer_name}}</li><li><strong>Ürün:</strong> {{product_name}}</li><li><strong>Varyant:</strong> {{variant_name}}</li><li><strong>Başvuru anındaki ürün fiyatı:</strong> {{product_price}}</li><li><strong>Sözleşmenin sunulduğu tarih:</strong> {{application_date}}</li></ul><p>Ürün, varyant ve fiyat bilgileri CENTER GSM kataloğundaki başvuru anı kayıtlarından alınır. Sonradan oluşabilecek katalog değişiklikleri bu başvuruda saklanan sözleşme ve ürün snapshot''ını değiştirmez.</p><h2>3. Değerlendirme ve satışın kesinleşmesi</h2><p>Başvuru CENTER GSM tarafından değerlendirilecek ve sonuç onay veya ret olabilir. Onay verilmesi hâlinde taksit sayısı, ödeme planı, teslimat ve satışa ilişkin kesin koşullar müşteriyle ayrıca teyit edilir. Başvuru gönderimi tek başına ödeme başlatmaz, stok düşürmez ve sipariş oluşturmaz.</p><h2>4. Bilgilerin ve belgelerin doğruluğu</h2><p>Müşteri, başvuruda verdiği bilgilerin ve yüklediği belgelerin kendisine ait, güncel ve doğru olduğunu; belgelerin yalnız başvurunun değerlendirilmesi amacıyla kullanılacağını bildiğini kabul eder.</p><h2>5. Sözleşme kabulü ve imza</h2><p>Müşteri, bu metni okuyup sözleşme kabul kutusunu işaretledikten sonra oluşturduğu imzanın; seçili ürün, varyant, fiyat ve bu sözleşmenin değişmez sürümüyle aynı başvuru kaydına bağlanacağını kabul eder.</p><h2>6. Kişisel veriler</h2><p>Kişisel verilerin işlenmesine ilişkin KVKK aydınlatması bu sözleşme kabulünden ayrı sunulur. Sözleşme kabulü pazarlama izni veya açık rıza beyanı olarak kullanılmaz.</p><h2>7. Kayıt ve bütünlük</h2><p>Müşteriye gösterilen sözleşmenin başlığı, sürümü, doldurulmuş içeriği, kabul zamanı ve SHA-256 özeti başvuruyla birlikte saklanır. Aktif sözleşme şablonunun daha sonra değişmesi, daha önce kaydedilmiş başvuru sözleşmesini değiştirmez.</p>',
  true
where not exists (
  select 1 from public.installment_contract_templates
);

create or replace function public.activate_installment_contract_template(
  p_template_id uuid,
  p_actor_user_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_template public.installment_contract_templates%rowtype;
begin
  select * into v_template
  from public.installment_contract_templates
  where id = p_template_id
  for update;

  if not found then raise exception 'contract_template_not_found'; end if;
  if p_actor_user_id is null or not exists(
    select 1 from auth.users
    where id = p_actor_user_id
      and raw_app_meta_data ->> 'role' = 'admin'
  ) then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  update public.installment_contract_templates
  set is_active = false
  where is_active and id <> p_template_id;

  update public.installment_contract_templates
  set is_active = true
  where id = p_template_id
  returning * into v_template;

  return jsonb_build_object(
    'id', v_template.id,
    'title', v_template.title,
    'version', v_template.version,
    'is_active', v_template.is_active
  );
end;
$$;

revoke all on function public.activate_installment_contract_template(uuid,uuid)
  from public, anon, authenticated;
grant execute on function public.activate_installment_contract_template(uuid,uuid)
  to service_role;

create or replace function public.submit_installment_application_v2(
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
  v_document_count integer;
  v_signature_document_id uuid;
  v_accepted_at timestamptz;
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

  select * into v_contract
  from public.installment_application_contracts
  where application_id = p_application_id
  for update;

  if not found then raise exception 'contract_snapshot_missing'; end if;
  if v_application.status = 'submitted' and v_contract.accepted_at is not null then
    return jsonb_build_object(
      'id', v_application.id,
      'application_number', v_application.application_number,
      'status', v_application.status,
      'contract_version', v_contract.contract_version,
      'contract_content_hash', v_contract.contract_content_hash
    );
  end if;
  if v_application.status <> 'draft' then raise exception 'invalid_status'; end if;
  if v_contract.accepted_at is not null then raise exception 'contract_already_accepted'; end if;
  if v_contract.contract_content_hash is distinct from encode(
    extensions.digest(v_contract.rendered_contract_content, 'sha256'),
    'hex'
  ) then
    raise exception 'contract_hash_mismatch';
  end if;
  if not exists(
    select 1 from public.installment_contract_templates
    where id = v_contract.contract_template_id
      and title = v_contract.contract_title
      and version = v_contract.contract_version
  ) then
    raise exception 'contract_template_mismatch';
  end if;
  if not exists(
    select 1 from public.installment_contract_templates where is_active
  ) then
    raise exception 'contract_unavailable';
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

  select count(distinct document_type) into v_document_count
  from public.installment_application_documents
  where application_id = p_application_id
    and document_type in ('identity_front','identity_back','residence','signature');
  if v_document_count <> 4 then raise exception 'documents_incomplete'; end if;

  select id into v_signature_document_id
  from public.installment_application_documents
  where application_id = p_application_id
    and document_type = 'signature';
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
    'contract_version', v_contract.contract_version,
    'contract_content_hash', v_contract.contract_content_hash
  );
end;
$$;

revoke all on function public.submit_installment_application_v2(uuid,text,text,text,boolean)
  from public, anon, authenticated;
grant execute on function public.submit_installment_application_v2(uuid,text,text,text,boolean)
  to service_role;

notify pgrst, 'reload schema';

commit;
