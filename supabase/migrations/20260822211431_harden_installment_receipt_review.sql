begin;

revoke all on function public.admin_review_installment_payment_receipt(uuid, text, text)
  from public, anon, authenticated, service_role;
drop function public.admin_review_installment_payment_receipt(uuid, text, text);

create function public.admin_review_installment_payment_receipt(
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
  if v_receipt.status <> 'pending_review' then
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

revoke all on function public.admin_review_installment_payment_receipt(uuid, text, text, uuid)
  from public, anon, authenticated;
grant execute on function public.admin_review_installment_payment_receipt(uuid, text, text, uuid)
  to service_role;

notify pgrst, 'reload schema';

commit;
