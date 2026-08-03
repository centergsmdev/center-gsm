begin;

create or replace function public.admin_update_order(
  p_order_id uuid,
  p_status text,
  p_payment_status text,
  p_note text,
  p_restore_stock boolean default false
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_history jsonb;
  v_current text;
  v_current_payment text;
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;

  if p_status not in ('received', 'preparing', 'shipped', 'delivered', 'cancelled') then
    raise exception 'invalid_status';
  end if;

  if p_payment_status not in (
    'pending',
    'awaiting_payment',
    'awaiting_phone_approval',
    'customer_unreachable',
    'paid',
    'failed',
    'cancelled',
    'refunded'
  ) then
    raise exception 'invalid_payment_status';
  end if;

  select status, payment_status, status_history
  into v_current, v_current_payment, v_history
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    return false;
  end if;

  if p_status = 'preparing' or p_payment_status = 'paid' then
    perform public.complete_order_inventory(p_order_id);
  end if;

  if p_status = 'cancelled' then
    perform public.release_order_inventory(p_order_id, p_restore_stock, false);
  end if;

  if p_payment_status = 'refunded' and p_restore_stock then
    perform public.release_order_inventory(p_order_id, true, true);
  end if;

  if v_current <> p_status then
    v_history := coalesce(v_history, '[]'::jsonb) || jsonb_build_array(
      jsonb_build_object(
        'status', p_status,
        'label', case p_status
          when 'received' then 'Sipariş alındı'
          when 'preparing' then 'Hazırlanıyor'
          when 'shipped' then 'Kargoya verildi'
          when 'delivered' then 'Teslim edildi'
          else 'İptal edildi'
        end,
        'at', timezone('utc', now())
      )
    );
  end if;

  if v_current_payment <> p_payment_status then
    v_history := coalesce(v_history, '[]'::jsonb) || jsonb_build_array(
      jsonb_build_object(
        'status', 'payment:' || p_payment_status,
        'label', case p_payment_status
          when 'pending' then 'Ödeme bekliyor'
          when 'awaiting_payment' then 'Ödeme bekleniyor'
          when 'awaiting_phone_approval' then 'Telefon ile onay bekleniyor'
          when 'customer_unreachable' then 'Müşteriye ulaşılamadı'
          when 'paid' then 'Ödeme alındı'
          when 'failed' then 'Ödeme reddedildi'
          when 'cancelled' then 'Ödeme iptal edildi'
          else 'Ödeme iade edildi'
        end,
        'at', timezone('utc', now())
      )
    );
  end if;

  update public.orders
  set
    status = p_status,
    payment_status = p_payment_status,
    admin_note = nullif(trim(p_note), ''),
    status_history = v_history
  where id = p_order_id;

  update public.payment_transactions
  set
    status = p_payment_status,
    note = coalesce(nullif(trim(p_note), ''), note)
  where order_id = p_order_id
    and transaction_type = 'payment';

  return true;
end;
$$;

revoke all on function public.admin_update_order(uuid, text, text, text, boolean) from public;
revoke all on function public.admin_update_order(uuid, text, text, text, boolean) from anon;
grant execute on function public.admin_update_order(uuid, text, text, text, boolean) to authenticated;

commit;
