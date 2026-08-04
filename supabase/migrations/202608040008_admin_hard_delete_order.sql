begin;

create or replace function public.admin_hard_delete_order(
  p_order_id uuid,
  p_order_number text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_receipt_paths text[];
  v_return_paths text[];
  v_gift_restore numeric := 0;
  v_store_balance_delta numeric := 0;
  v_store_lifetime_added numeric := 0;
  v_store_lifetime_spent numeric := 0;
  v_gift record;
  v_store record;
begin
  if not public.current_user_is_admin() then
    raise exception 'forbidden';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'order_not_found';
  end if;

  if trim(coalesce(p_order_number, '')) <> v_order.order_number then
    raise exception 'order_number_mismatch';
  end if;

  select coalesce(array_agg(storage_path), array[]::text[])
  into v_receipt_paths
  from public.payment_receipts
  where order_id = p_order_id;

  select coalesce(array_agg(ra.storage_path), array[]::text[])
  into v_return_paths
  from public.return_attachments ra
  join public.return_requests rr on rr.id = ra.return_request_id
  where rr.order_id = p_order_id;

  perform public.release_order_inventory(p_order_id, true, false);
  perform public.refund_loyalty_points(p_order_id);

  for v_gift in
    select gift_card_id, -sum(amount) as balance_delta
    from public.gift_card_transactions
    where order_id = p_order_id
    group by gift_card_id
  loop
    if v_gift.balance_delta <> 0 then
      update public.gift_cards
      set balance = greatest(0, balance + v_gift.balance_delta),
          is_active = case
            when balance + v_gift.balance_delta > 0 then true
            else is_active
          end,
          updated_at = timezone('utc', now())
      where id = v_gift.gift_card_id;
    end if;
  end loop;

  for v_store in
    select
      account_id,
      -sum(amount) as balance_delta,
      sum(case when type in ('load', 'refund', 'bonus') then amount else 0 end) as lifetime_added_delta,
      sum(case when type = 'spend' then abs(amount) else 0 end) as lifetime_spent_delta
    from public.store_credit_transactions
    where order_id = p_order_id
    group by account_id
  loop
    update public.store_credit_accounts
    set balance = greatest(0, balance + v_store.balance_delta),
        lifetime_added = greatest(0, lifetime_added - v_store.lifetime_added_delta),
        lifetime_spent = greatest(0, lifetime_spent - v_store.lifetime_spent_delta),
        updated_at = timezone('utc', now())
    where id = v_store.account_id;
  end loop;

  delete from public.payment_refunds where order_id = p_order_id;
  delete from public.return_requests where order_id = p_order_id;
  delete from public.shipments where order_id = p_order_id;
  delete from public.reward_redemptions where order_id = p_order_id;
  delete from public.loyalty_transactions where order_id = p_order_id;
  delete from public.gift_card_transactions where order_id = p_order_id;
  delete from public.store_credit_transactions where order_id = p_order_id;
  delete from public.inventory_movements where order_id = p_order_id;
  delete from public.analytics_events
  where entity_id = p_order_id::text
     or payload ->> 'order_id' = p_order_id::text;
  delete from public.notification_events
  where entity_id = p_order_id::text
     or payload ->> 'order_id' = p_order_id::text;
  delete from public.customer_activity
  where metadata ->> 'order_id' = p_order_id::text;
  delete from public.audit_logs
  where entity_id = p_order_id::text
     or metadata ->> 'order_id' = p_order_id::text;

  delete from public.orders where id = p_order_id;

  return jsonb_build_object(
    'deleted', true,
    'order_number', v_order.order_number,
    'receipt_paths', to_jsonb(v_receipt_paths),
    'return_attachment_paths', to_jsonb(v_return_paths)
  );
end;
$$;

revoke all on function public.admin_hard_delete_order(uuid, text) from public, anon;
grant execute on function public.admin_hard_delete_order(uuid, text) to authenticated;

drop policy if exists "Admins can delete payment receipt files" on storage.objects;
create policy "Admins can delete payment receipt files"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'payment-receipts'
    and public.current_user_is_admin()
  );

commit;
