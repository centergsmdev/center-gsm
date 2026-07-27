begin;

create table if not exists public.return_requests (
  id uuid primary key default gen_random_uuid(),
  rma_number text not null unique default ('RMA-' || to_char(timezone('utc',now()),'YYYY') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  order_id uuid not null references public.orders(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'new' check (status in ('new','reviewing','awaiting_photos','approved','rejected','awaiting_product','product_received','inspected','refund_approved','exchange_approved','refund_completed','exchange_completed','cancelled')),
  request_type text not null default 'return' check (request_type in ('return','exchange','warranty')),
  reason text not null check (reason in ('wrong_product','damaged_product','missing_product','shipping_damage','changed_mind','defective_product','warranty','other')),
  description text not null check (char_length(trim(description)) between 10 and 4000),
  internal_note text,
  customer_note text,
  closed_at timestamptz,
  created_at timestamptz not null default timezone('utc',now()), updated_at timestamptz not null default timezone('utc',now())
);
create table if not exists public.return_request_items (
  id uuid primary key default gen_random_uuid(), return_request_id uuid not null references public.return_requests(id) on delete cascade,
  order_item_id uuid not null references public.order_items(id) on delete restrict, quantity integer not null check(quantity>0),
  resolution text check(resolution is null or resolution in ('refund','exchange','repair','reject')),
  created_at timestamptz not null default timezone('utc',now()), updated_at timestamptz not null default timezone('utc',now()), unique(return_request_id,order_item_id)
);
create table if not exists public.return_messages (
  id uuid primary key default gen_random_uuid(), return_request_id uuid not null references public.return_requests(id) on delete cascade,
  sender_user_id uuid not null references auth.users(id) on delete restrict, sender_role text not null check(sender_role in ('customer','admin')),
  message text not null check(char_length(trim(message)) between 1 and 4000), is_internal boolean not null default false,
  created_at timestamptz not null default timezone('utc',now()), updated_at timestamptz not null default timezone('utc',now())
);
create table if not exists public.return_attachments (
  id uuid primary key default gen_random_uuid(), return_request_id uuid not null references public.return_requests(id) on delete cascade,
  message_id uuid references public.return_messages(id) on delete set null, uploaded_by uuid not null references auth.users(id) on delete restrict,
  storage_path text not null unique, file_name text not null, mime_type text not null check(mime_type in ('image/jpeg','image/png','image/webp','video/mp4','video/webm','application/pdf')),
  file_size bigint not null check(file_size>0 and file_size<=52428800), created_at timestamptz not null default timezone('utc',now()), updated_at timestamptz not null default timezone('utc',now())
);
create table if not exists public.return_status_history (
  id uuid primary key default gen_random_uuid(), return_request_id uuid not null references public.return_requests(id) on delete cascade,
  from_status text, to_status text not null, changed_by uuid not null references auth.users(id) on delete restrict, note text,
  created_at timestamptz not null default timezone('utc',now()), updated_at timestamptz not null default timezone('utc',now())
);
create index if not exists return_requests_user_created_idx on public.return_requests(user_id,created_at desc);
create index if not exists return_requests_order_idx on public.return_requests(order_id);
create index if not exists return_requests_status_created_idx on public.return_requests(status,created_at desc);
create index if not exists return_items_request_idx on public.return_request_items(return_request_id);
create index if not exists return_messages_request_created_idx on public.return_messages(return_request_id,created_at);
create index if not exists return_history_request_created_idx on public.return_status_history(return_request_id,created_at);

alter table public.return_requests enable row level security; alter table public.return_request_items enable row level security;
alter table public.return_messages enable row level security; alter table public.return_attachments enable row level security; alter table public.return_status_history enable row level security;
drop policy if exists return_requests_owner_admin_read on public.return_requests;
create policy return_requests_owner_admin_read on public.return_requests for select using(user_id=auth.uid() or public.current_user_is_admin());
drop policy if exists return_items_owner_admin_read on public.return_request_items;
create policy return_items_owner_admin_read on public.return_request_items for select using(exists(select 1 from public.return_requests r where r.id=return_request_id and (r.user_id=auth.uid() or public.current_user_is_admin())));
drop policy if exists return_messages_owner_admin_read on public.return_messages;
create policy return_messages_owner_admin_read on public.return_messages for select using(not is_internal and exists(select 1 from public.return_requests r where r.id=return_request_id and r.user_id=auth.uid()) or public.current_user_is_admin());
drop policy if exists return_attachments_owner_admin_read on public.return_attachments;
create policy return_attachments_owner_admin_read on public.return_attachments for select using(public.current_user_is_admin() or (exists(select 1 from public.return_requests r where r.id=return_request_id and r.user_id=auth.uid()) and (message_id is null or exists(select 1 from public.return_messages m where m.id=message_id and not m.is_internal))));
drop policy if exists return_history_owner_admin_read on public.return_status_history;
create policy return_history_owner_admin_read on public.return_status_history for select using(exists(select 1 from public.return_requests r where r.id=return_request_id and (r.user_id=auth.uid() or public.current_user_is_admin())));
revoke insert,update,delete on public.return_requests,public.return_request_items,public.return_messages,public.return_attachments,public.return_status_history from anon,authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('return-attachments','return-attachments',false,52428800,array['image/jpeg','image/png','image/webp','video/mp4','video/webm','application/pdf']) on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists return_storage_owner_admin_read on storage.objects;
create policy return_storage_owner_admin_read on storage.objects for select to authenticated using(bucket_id='return-attachments' and (public.current_user_is_admin() or (storage.foldername(name))[1]=auth.uid()::text));
drop policy if exists return_storage_owner_upload on storage.objects;
create policy return_storage_owner_upload on storage.objects for insert to authenticated with check(bucket_id='return-attachments' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists return_storage_owner_admin_delete on storage.objects;
create policy return_storage_owner_admin_delete on storage.objects for delete to authenticated using(bucket_id='return-attachments' and (public.current_user_is_admin() or (storage.foldername(name))[1]=auth.uid()::text));

create or replace function public.create_return_request(p_order_id uuid,p_reason text,p_description text,p_items jsonb,p_request_type text default 'return') returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_item jsonb; v_user uuid:=auth.uid();
begin
 if v_user is null or not exists(select 1 from public.orders where id=p_order_id and user_id=v_user) then raise exception 'forbidden'; end if;
 if jsonb_array_length(coalesce(p_items,'[]'::jsonb))=0 then raise exception 'items_required'; end if;
 insert into public.return_requests(order_id,user_id,reason,description,request_type) values(p_order_id,v_user,p_reason,trim(p_description),p_request_type) returning id into v_id;
 for v_item in select * from jsonb_array_elements(p_items) loop
  if not exists(select 1 from public.order_items oi where oi.id=(v_item->>'order_item_id')::uuid and oi.order_id=p_order_id and (v_item->>'quantity')::int between 1 and oi.quantity) then raise exception 'invalid_item'; end if;
  insert into public.return_request_items(return_request_id,order_item_id,quantity) values(v_id,(v_item->>'order_item_id')::uuid,(v_item->>'quantity')::int);
 end loop;
 insert into public.return_status_history(return_request_id,to_status,changed_by,note) values(v_id,'new',v_user,'Talep oluşturuldu');
 perform public.write_audit_log('return_created','order',v_id::text,'RMA',null,jsonb_build_object('order_id',p_order_id,'reason',p_reason),'{}');
 perform public.publish_notification_event('return_created','return',v_id::text,jsonb_build_object('user_id',v_user));
 insert into public.analytics_events(event_name,entity_type,entity_id,user_id,payload) values('return_request','return',v_id::text,v_user,jsonb_build_object('reason',p_reason)),('return_reason','return',v_id::text,v_user,jsonb_build_object('reason',p_reason));
 insert into public.customer_activity(customer_id,activity_type,description,metadata) select cp.id,'return_created','İade/değişim talebi oluşturuldu',jsonb_build_object('return_id',v_id) from public.customer_profiles cp where cp.user_id=v_user;
 return v_id;
end$$;
create or replace function public.update_return_status(p_return_id uuid,p_status text,p_internal_note text default null,p_customer_note text default null) returns boolean language plpgsql security definer set search_path='' as $$
declare v_old text; v_user uuid; begin if not public.current_user_is_admin() then raise exception 'forbidden'; end if;
 select status,user_id into v_old,v_user from public.return_requests where id=p_return_id for update; if not found then raise exception 'not_found'; end if;
 update public.return_requests set status=p_status,internal_note=coalesce(p_internal_note,internal_note),customer_note=coalesce(p_customer_note,customer_note),closed_at=case when p_status in('rejected','refund_completed','exchange_completed','cancelled') then timezone('utc',now()) else null end,updated_at=timezone('utc',now()) where id=p_return_id;
 insert into public.return_status_history(return_request_id,from_status,to_status,changed_by,note) values(p_return_id,v_old,p_status,auth.uid(),p_customer_note);
 perform public.write_audit_log('return_status_changed','order',p_return_id::text,'RMA',jsonb_build_object('status',v_old),jsonb_build_object('status',p_status),jsonb_build_object('internal_note',p_internal_note));
 perform public.publish_notification_event('return_status_changed','return',p_return_id::text,jsonb_build_object('user_id',v_user,'status',p_status));
 return true; end$$;
create or replace function public.add_return_message(p_return_id uuid,p_message text,p_is_internal boolean default false) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_owner uuid; v_admin boolean:=public.current_user_is_admin(); begin select user_id into v_owner from public.return_requests where id=p_return_id;
 if not found or (not v_admin and v_owner<>auth.uid()) or (p_is_internal and not v_admin) then raise exception 'forbidden'; end if;
 insert into public.return_messages(return_request_id,sender_user_id,sender_role,message,is_internal) values(p_return_id,auth.uid(),case when v_admin then 'admin' else 'customer' end,trim(p_message),p_is_internal) returning id into v_id;
 perform public.write_audit_log('return_message_added','order',p_return_id::text,'RMA message',null,null,jsonb_build_object('message_id',v_id,'internal',p_is_internal));
 if not p_is_internal then perform public.publish_notification_event('return_message_received','return',p_return_id::text,jsonb_build_object('recipient_user_id',case when v_admin then v_owner else null end)); end if; return v_id; end$$;
create or replace function public.close_return_request(p_return_id uuid,p_note text default null) returns boolean language plpgsql security definer set search_path='' as $$declare v_old text; begin
 if not public.current_user_is_admin() and not exists(select 1 from public.return_requests where id=p_return_id and user_id=auth.uid() and status in('new','reviewing','awaiting_photos')) then raise exception 'forbidden'; end if;
 select status into v_old from public.return_requests where id=p_return_id for update; if not found then raise exception 'not_found'; end if;
 update public.return_requests set status='cancelled',closed_at=timezone('utc',now()),updated_at=timezone('utc',now()) where id=p_return_id;
 insert into public.return_status_history(return_request_id,from_status,to_status,changed_by,note) values(p_return_id,v_old,'cancelled',auth.uid(),p_note);
 perform public.write_audit_log('return_closed','order',p_return_id::text,'RMA',null,jsonb_build_object('status','cancelled'),'{}'); return true; end$$;
create or replace function public.register_return_attachment(p_return_id uuid,p_storage_path text,p_file_name text,p_mime_type text,p_file_size bigint,p_message_id uuid default null) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid; begin
 if not exists(select 1 from public.return_requests r where r.id=p_return_id and (r.user_id=auth.uid() or public.current_user_is_admin())) then raise exception 'forbidden'; end if;
 if split_part(p_storage_path,'/',1)<>auth.uid()::text then raise exception 'invalid_path'; end if;
 insert into public.return_attachments(return_request_id,message_id,uploaded_by,storage_path,file_name,mime_type,file_size) values(p_return_id,p_message_id,auth.uid(),p_storage_path,p_file_name,p_mime_type,p_file_size) returning id into v_id;
 perform public.write_audit_log('return_attachment_uploaded','order',p_return_id::text,'RMA attachment',null,null,jsonb_build_object('attachment_id',v_id,'mime_type',p_mime_type)); return v_id;
end$$;
revoke all on function public.create_return_request(uuid,text,text,jsonb,text),public.update_return_status(uuid,text,text,text),public.add_return_message(uuid,text,boolean),public.close_return_request(uuid,text) from public,anon;
grant execute on function public.create_return_request(uuid,text,text,jsonb,text),public.update_return_status(uuid,text,text,text),public.add_return_message(uuid,text,boolean),public.close_return_request(uuid,text) to authenticated;
revoke all on function public.register_return_attachment(uuid,text,text,text,bigint,uuid) from public,anon;
grant execute on function public.register_return_attachment(uuid,text,text,text,bigint,uuid) to authenticated;
commit;
