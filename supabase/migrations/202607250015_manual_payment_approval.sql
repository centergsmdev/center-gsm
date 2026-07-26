-- Manual payment approval flow. Apply manually after review.
begin;

alter table public.payment_transactions drop constraint if exists payment_transactions_status_check;
alter table public.payment_transactions add constraint payment_transactions_status_check check(status in ('pending','awaiting_payment','awaiting_phone_approval','customer_unreachable','paid','failed','cancelled','refunded'));

alter function public.create_order(jsonb) rename to create_order_without_manual_approval;
create or replace function public.create_order(p_payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_method text:=p_payload->>'payment_method'; v_payload jsonb:=p_payload; v_result jsonb; v_order uuid; v_user uuid;
begin
  if v_method not in ('transfer','phone_approval') then raise exception 'invalid_payment_method'; end if;
  -- Existing order pipeline only knows legacy methods. This internal value is replaced atomically and never exposed.
  if v_method='phone_approval' then v_payload:=jsonb_set(v_payload,'{payment_method}','"cash"'::jsonb); end if;
  v_result:=public.create_order_without_manual_approval(v_payload);
  v_order:=(v_result->>'id')::uuid;
  select user_id into v_user from public.orders where id=v_order;
  if v_method='phone_approval' then
    update public.orders set payment_method='phone_approval',payment_status='awaiting_phone_approval',payment_note='Telefon ile ödeme onayı bekleniyor.',payment_account_snapshot=null,
      status_history=coalesce(status_history,'[]'::jsonb)||jsonb_build_array(jsonb_build_object('status','payment:awaiting_phone_approval','label','Telefon ile onay bekleniyor','at',timezone('utc',now()))) where id=v_order;
    update public.payment_transactions set provider='manual_phone_approval',status='awaiting_phone_approval',payment_account_id=null,note='Telefon ile ödeme onayı bekleniyor.',metadata=metadata||jsonb_build_object('payment_method','phone_approval') where order_id=v_order and transaction_type='payment';
    perform public.publish_notification_event('payment_phone_requested','order',v_order::text,jsonb_build_object('user_id',v_user,'order_number',v_result->>'order_number'));
    insert into public.customer_activity(customer_id,activity_type,description,metadata) select id,'payment_requested','Telefon ile ödeme onayı talep edildi',jsonb_build_object('order_id',v_order) from public.customer_profiles where user_id=v_user;
  end if;
  insert into public.analytics_events(event_name,entity_type,entity_id,user_id,payload) values('payment_method_selected','order',v_order::text,v_user,jsonb_build_object('method',v_method));
  return v_result;
end $$;

create or replace function public.admin_update_manual_payment(p_order_id uuid,p_action text,p_note text default '')
returns boolean language plpgsql security definer set search_path='' as $$
declare v_order public.orders%rowtype; v_new_status text; v_order_status text; v_notification text; v_crm text; v_analytics text;
begin
  if not public.current_user_is_admin() then raise exception 'forbidden'; end if;
  if p_action not in ('paid','rejected','unreachable','waiting') then raise exception 'invalid_action'; end if;
  select * into v_order from public.orders where id=p_order_id for update;
  if not found then return false; end if;
  v_new_status:=case p_action when 'paid' then 'paid' when 'rejected' then 'failed' when 'unreachable' then 'customer_unreachable' else case when v_order.payment_method='phone_approval' then 'awaiting_phone_approval' else 'awaiting_payment' end end;
  v_order_status:=case when p_action='paid' then 'preparing' else v_order.status end;
  v_notification:=case when p_action='paid' then 'payment_completed' when p_action='rejected' then 'payment_rejected' else null end;
  v_crm:=case when p_action='paid' then 'payment_completed' when p_action='rejected' then 'payment_failed' else 'payment_requested' end;
  v_analytics:=case when p_action='paid' then 'payment_completed' when p_action='rejected' then 'payment_failed' else null end;
  update public.orders set status=v_order_status,payment_status=v_new_status,admin_note=coalesce(nullif(trim(p_note),''),admin_note),
    status_history=coalesce(status_history,'[]'::jsonb)||jsonb_build_array(jsonb_build_object('status','payment:'||v_new_status,'label',case p_action when 'paid' then 'Ödeme alındı' when 'rejected' then 'Ödeme reddedildi' when 'unreachable' then 'Müşteriye ulaşılamadı' else 'Ödeme bekleniyor' end,'at',timezone('utc',now()),'admin_id',auth.uid())) where id=p_order_id;
  update public.payment_transactions set status=v_new_status,note=coalesce(nullif(trim(p_note),''),note),updated_at=now() where order_id=p_order_id and transaction_type='payment';
  if v_notification is not null then perform public.publish_notification_event(v_notification,'order',p_order_id::text,jsonb_build_object('user_id',v_order.user_id,'order_number',v_order.order_number)); end if;
  insert into public.customer_activity(customer_id,activity_type,description,metadata) select id,v_crm,v_crm,jsonb_build_object('order_id',p_order_id,'status',v_new_status) from public.customer_profiles where user_id=v_order.user_id;
  if v_analytics is not null then insert into public.analytics_events(event_name,entity_type,entity_id,user_id,payload) values(v_analytics,'order',p_order_id::text,v_order.user_id,jsonb_build_object('method',v_order.payment_method)); end if;
  perform public.write_audit_log(case when p_action='paid' then 'payment_approved' else 'payment_updated' end,'payment',p_order_id::text,v_order.order_number,jsonb_build_object('payment_status',v_order.payment_status,'order_status',v_order.status),jsonb_build_object('payment_status',v_new_status,'order_status',v_order_status),jsonb_build_object('action',p_action,'note',left(p_note,500)));
  return true;
end $$;

revoke all on function public.create_order(jsonb),public.admin_update_manual_payment(uuid,text,text) from public;
grant execute on function public.create_order(jsonb) to anon,authenticated;
grant execute on function public.admin_update_manual_payment(uuid,text,text) to authenticated;
commit;
