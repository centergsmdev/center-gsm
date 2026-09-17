create or replace function public.create_gift_card(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_code text;
  v_amount numeric;
begin
  if not public.current_user_is_admin() then
    raise exception 'forbidden';
  end if;

  v_amount := (p_payload ->> 'balance')::numeric;
  if v_amount <= 0 then
    raise exception 'invalid_amount';
  end if;

  v_code := upper(
    coalesce(
      nullif(trim(p_payload ->> 'code'), ''),
      'CG-' || encode(extensions.gen_random_bytes(12), 'hex')
    )
  );

  insert into public.gift_cards (
    code,
    title,
    initial_balance,
    balance,
    currency,
    owner_user_id,
    starts_at,
    ends_at,
    is_active,
    is_single_use,
    gift_note,
    created_by
  )
  values (
    v_code,
    p_payload ->> 'title',
    v_amount,
    v_amount,
    coalesce(p_payload ->> 'currency', 'TRY'),
    nullif(p_payload ->> 'owner_user_id', '')::uuid,
    nullif(p_payload ->> 'starts_at', '')::timestamptz,
    nullif(p_payload ->> 'ends_at', '')::timestamptz,
    coalesce((p_payload ->> 'is_active')::boolean, true),
    coalesce((p_payload ->> 'is_single_use')::boolean, false),
    p_payload ->> 'gift_note',
    auth.uid()
  )
  returning id into v_id;

  insert into public.gift_card_transactions (
    gift_card_id,
    user_id,
    type,
    amount,
    balance_after,
    description,
    idempotency_key
  )
  values (
    v_id,
    nullif(p_payload ->> 'owner_user_id', '')::uuid,
    'issue',
    v_amount,
    v_amount,
    'Gift card issued',
    'issue:' || v_id
  );

  perform public.write_audit_log(
    'gift_card_created',
    'payment',
    v_id::text,
    v_code,
    null,
    jsonb_build_object('amount', v_amount),
    '{}'
  );
  perform public.publish_notification_event(
    'gift_card_created',
    'gift_card',
    v_id::text,
    jsonb_build_object(
      'user_id', p_payload ->> 'owner_user_id',
      'title', p_payload ->> 'title'
    )
  );

  return v_id;
end;
$$;
