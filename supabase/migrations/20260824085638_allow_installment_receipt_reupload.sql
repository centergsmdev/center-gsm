begin;

alter table public.installment_payment_receipts
  add column superseded_at timestamptz;

alter table public.installment_payment_receipts
  add constraint installment_payment_receipts_superseded_at_check
  check (superseded_at is null or superseded_at >= created_at);

drop index public.installment_payment_receipts_one_active_portal_idx;
create unique index installment_payment_receipts_one_active_portal_idx
  on public.installment_payment_receipts(portal_id)
  where status in ('pending_review', 'approved')
    and superseded_at is null;

create function public.replace_installment_payment_receipt(
  p_portal_id uuid,
  p_storage_path text,
  p_original_name text,
  p_mime_type text,
  p_size_bytes bigint,
  p_sha256 text
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_portal public.installment_customer_portals%rowtype;
  v_plan public.installment_application_payment_plans%rowtype;
  v_receipt_id uuid;
  v_superseded_count integer;
begin
  select * into v_portal
  from public.installment_customer_portals
  where id = p_portal_id
  for update;

  if not found then
    raise exception 'portal_not_found';
  end if;
  if v_portal.stage not in (
    'down_payment_pending',
    'payment_under_review',
    'payment_confirmed'
  ) then
    raise exception 'receipt_upload_not_allowed';
  end if;

  select * into v_plan
  from public.installment_application_payment_plans
  where application_id = v_portal.application_id;

  if not found then
    raise exception 'payment_plan_not_found';
  end if;

  update public.installment_payment_receipts
  set superseded_at = timezone('utc', now())
  where portal_id = v_portal.id
    and status in ('pending_review', 'approved')
    and superseded_at is null;
  get diagnostics v_superseded_count = row_count;

  insert into public.installment_payment_receipts (
    portal_id,
    application_id,
    payment_account_id,
    amount_minor,
    storage_path,
    original_name,
    mime_type,
    size_bytes,
    sha256
  ) values (
    v_portal.id,
    v_portal.application_id,
    v_portal.payment_account_id,
    v_plan.down_payment_amount_minor,
    p_storage_path,
    p_original_name,
    p_mime_type,
    p_size_bytes,
    p_sha256
  )
  returning id into v_receipt_id;

  update public.installment_customer_portals
  set stage = 'payment_under_review'
  where id = v_portal.id;

  insert into public.installment_application_events (
    application_id,
    event_type,
    actor_type,
    metadata
  ) values (
    v_portal.application_id,
    'portal.receipt_uploaded',
    'customer',
    jsonb_build_object(
      'portal_id', v_portal.id,
      'receipt_id', v_receipt_id,
      'amount_minor', v_plan.down_payment_amount_minor,
      'mime_type', p_mime_type,
      'size_bytes', p_size_bytes,
      'replaced_previous_receipt', v_superseded_count > 0
    )
  );

  return v_receipt_id;
end;
$$;

revoke all on function public.replace_installment_payment_receipt(
  uuid, text, text, text, bigint, text
) from public, anon, authenticated;
grant execute on function public.replace_installment_payment_receipt(
  uuid, text, text, text, bigint, text
) to service_role;

create or replace function public.admin_review_installment_payment_receipt(
  p_receipt_id uuid,
  p_status text,
  p_rejection_reason text,
  p_actor_user_id uuid
) returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_receipt public.installment_payment_receipts%rowtype;
begin
  if p_status not in ('approved', 'rejected') then
    raise exception 'invalid_receipt_status';
  end if;
  if p_actor_user_id is null then
    raise exception 'admin_required';
  end if;
  if p_status = 'rejected' and char_length(trim(coalesce(p_rejection_reason, ''))) not between 3 and 500 then
    raise exception 'rejection_reason_required';
  end if;

  select * into v_receipt
  from public.installment_payment_receipts
  where id = p_receipt_id
  for update;
  if not found then
    raise exception 'receipt_not_found';
  end if;
  if v_receipt.status <> 'pending_review' or v_receipt.superseded_at is not null then
    raise exception 'receipt_already_reviewed';
  end if;

  update public.installment_payment_receipts
  set status = p_status,
      rejection_reason_public = case
        when p_status = 'rejected' then trim(p_rejection_reason)
        else null
      end,
      reviewed_at = timezone('utc', now()),
      reviewed_by = p_actor_user_id
  where id = p_receipt_id;

  update public.installment_customer_portals
  set stage = case
        when p_status = 'approved' then 'payment_confirmed'
        else 'down_payment_pending'
      end,
      updated_by = p_actor_user_id
  where id = v_receipt.portal_id;

  insert into public.installment_application_events (
    application_id,
    event_type,
    actor_type,
    actor_user_id,
    metadata
  ) values (
    v_receipt.application_id,
    case
      when p_status = 'approved' then 'portal.receipt_approved'
      else 'portal.receipt_rejected'
    end,
    'admin',
    p_actor_user_id,
    jsonb_build_object(
      'portal_id', v_receipt.portal_id,
      'receipt_id', v_receipt.id,
      'amount_minor', v_receipt.amount_minor
    )
  );
end;
$$;

revoke all on function public.admin_review_installment_payment_receipt(
  uuid, text, text, uuid
) from public, anon, authenticated;
grant execute on function public.admin_review_installment_payment_receipt(
  uuid, text, text, uuid
) to service_role;

notify pgrst, 'reload schema';

commit;
