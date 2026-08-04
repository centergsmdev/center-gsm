-- Allow regular customers to create phone-approval orders without granting
-- them access to the admin-only notification publisher.
begin;

create or replace function public.create_order(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_method text := p_payload->>'payment_method';
  v_payload jsonb := p_payload;
  v_result jsonb;
  v_order uuid;
  v_user uuid;
  v_event uuid;
  v_template record;
  v_recipient text;
  v_notification_payload jsonb;
begin
  if v_method not in ('transfer', 'phone_approval') then
    raise exception 'invalid_payment_method';
  end if;

  -- The existing order pipeline only knows the legacy cash method. It is
  -- replaced with the customer-facing phone approval method atomically below.
  if v_method = 'phone_approval' then
    v_payload := jsonb_set(v_payload, '{payment_method}', '"cash"'::jsonb);
  end if;

  v_result := public.create_order_without_manual_approval(v_payload);
  v_order := (v_result->>'id')::uuid;

  select user_id
  into v_user
  from public.orders
  where id = v_order;

  if v_method = 'phone_approval' then
    update public.orders
    set payment_method = 'phone_approval',
        payment_status = 'awaiting_phone_approval',
        payment_note = 'Telefon ile ödeme onayı bekleniyor.',
        payment_account_snapshot = null,
        status_history = coalesce(status_history, '[]'::jsonb) ||
          jsonb_build_array(jsonb_build_object(
            'status', 'payment:awaiting_phone_approval',
            'label', 'Telefon ile onay bekleniyor',
            'at', timezone('utc', now())
          ))
    where id = v_order;

    update public.payment_transactions
    set provider = 'manual_phone_approval',
        status = 'awaiting_phone_approval',
        payment_account_id = null,
        note = 'Telefon ile ödeme onayı bekleniyor.',
        metadata = metadata || jsonb_build_object('payment_method', 'phone_approval')
    where order_id = v_order
      and transaction_type = 'payment';

    -- publish_notification_event is intentionally admin-only. Build this
    -- server-owned event here instead of invoking that public admin action.
    v_notification_payload := jsonb_build_object(
      'user_id', v_user,
      'order_number', v_result->>'order_number'
    );

    insert into public.notification_events(event_type, entity_type, entity_id, payload)
    values ('payment_phone_requested', 'order', v_order::text, v_notification_payload)
    returning id into v_event;

    for v_template in
      select *
      from public.notification_templates
      where is_active
        and code like 'payment_phone_requested\_%' escape '\'
    loop
      v_recipient := case v_template.channel
        when 'email' then v_notification_payload->>'recipient_email'
        when 'sms' then v_notification_payload->>'recipient_phone'
        when 'whatsapp' then v_notification_payload->>'recipient_phone'
        when 'push' then v_notification_payload->>'push_token'
        else coalesce(
          v_notification_payload->>'user_id',
          v_notification_payload->>'recipient_email'
        )
      end;

      if nullif(trim(v_recipient), '') is not null then
        insert into public.notification_queue(event_id, template_id, channel, recipient)
        values (v_event, v_template.id, v_template.channel, v_recipient);
      end if;
    end loop;

    update public.notification_events
    set status = 'processed',
        processed_at = timezone('utc', now())
    where id = v_event;

    insert into public.customer_activity(
      customer_id,
      activity_type,
      description,
      metadata
    )
    select
      id,
      'payment_requested',
      'Telefon ile ödeme onayı talep edildi',
      jsonb_build_object('order_id', v_order)
    from public.customer_profiles
    where user_id = v_user;
  end if;

  insert into public.analytics_events(
    event_name,
    entity_type,
    entity_id,
    user_id,
    payload
  )
  values (
    'payment_method_selected',
    'order',
    v_order::text,
    v_user,
    jsonb_build_object('method', v_method)
  );

  return v_result;
end;
$$;

revoke all on function public.create_order(jsonb) from public;
grant execute on function public.create_order(jsonb) to anon, authenticated;

notify pgrst, 'reload schema';

commit;
