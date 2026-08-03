begin;

create table public.payment_receipts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  upload_token uuid not null unique default gen_random_uuid(),
  storage_path text not null unique,
  original_name text not null,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 10485760),
  status text not null default 'awaiting_upload' check (status in ('awaiting_upload', 'pending_review', 'approved', 'rejected')),
  uploaded_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index payment_receipts_status_created_idx
  on public.payment_receipts(status, created_at desc);

alter table public.payment_receipts enable row level security;

create policy "Admins can read payment receipts"
  on public.payment_receipts for select to authenticated
  using ((select public.is_admin()));

create policy "Admins can update payment receipts"
  on public.payment_receipts for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

revoke all on public.payment_receipts from anon, authenticated;
grant select, update on public.payment_receipts to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-receipts',
  'payment-receipts',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.can_upload_payment_receipt(p_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.payment_receipts r
    where r.storage_path = p_path
      and r.status = 'awaiting_upload'
      and r.uploaded_at is null
      and r.created_at > timezone('utc', now()) - interval '30 minutes'
  );
$$;

revoke all on function public.can_upload_payment_receipt(text) from public;
grant execute on function public.can_upload_payment_receipt(text) to anon, authenticated;

create policy "Customers can upload prepared payment receipts"
  on storage.objects for insert to anon, authenticated
  with check (
    bucket_id = 'payment-receipts'
    and public.can_upload_payment_receipt(name)
  );

create policy "Admins can read payment receipt files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'payment-receipts'
    and (select public.is_admin())
  );

create or replace function public.prepare_payment_receipt_upload(
  p_order_number text,
  p_contact text,
  p_original_name text,
  p_mime_type text,
  p_size_bytes bigint
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_receipt public.payment_receipts%rowtype;
  v_extension text;
begin
  if p_mime_type not in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf') then
    raise exception 'invalid_receipt_type';
  end if;
  if p_size_bytes <= 0 or p_size_bytes > 10485760 then
    raise exception 'invalid_receipt_size';
  end if;

  select * into v_order
  from public.orders o
  where upper(o.order_number) = upper(trim(p_order_number))
    and o.payment_method = 'transfer'
    and (
      lower(o.delivery_address->>'email') = lower(trim(p_contact))
      or regexp_replace(o.delivery_address->>'phone', '\D', '', 'g') = regexp_replace(p_contact, '\D', '', 'g')
      or (o.user_id is not null and o.user_id = auth.uid())
    )
  limit 1;

  if not found then
    raise exception 'order_not_found';
  end if;

  select * into v_receipt
  from public.payment_receipts
  where order_id = v_order.id
  for update;

  if found and v_receipt.uploaded_at is not null then
    raise exception 'receipt_already_uploaded';
  end if;

  v_extension := case p_mime_type
    when 'image/jpeg' then 'jpg'
    when 'image/png' then 'png'
    when 'image/webp' then 'webp'
    else 'pdf'
  end;

  if found then
    update public.payment_receipts
    set
      upload_token = gen_random_uuid(),
      storage_path = gen_random_uuid()::text || '/' || gen_random_uuid()::text || '.' || v_extension,
      original_name = left(trim(p_original_name), 255),
      mime_type = p_mime_type,
      size_bytes = p_size_bytes,
      created_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
    where id = v_receipt.id
    returning * into v_receipt;
  else
    insert into public.payment_receipts (
      order_id, storage_path, original_name, mime_type, size_bytes
    ) values (
      v_order.id,
      gen_random_uuid()::text || '/' || gen_random_uuid()::text || '.' || v_extension,
      left(trim(p_original_name), 255),
      p_mime_type,
      p_size_bytes
    ) returning * into v_receipt;
  end if;

  return jsonb_build_object(
    'receipt_id', v_receipt.id,
    'upload_token', v_receipt.upload_token,
    'storage_path', v_receipt.storage_path
  );
end;
$$;

create or replace function public.finalize_payment_receipt_upload(
  p_order_number text,
  p_contact text,
  p_upload_token uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_receipt public.payment_receipts%rowtype;
begin
  select r.* into v_receipt
  from public.payment_receipts r
  join public.orders o on o.id = r.order_id
  where r.upload_token = p_upload_token
    and upper(o.order_number) = upper(trim(p_order_number))
    and o.payment_method = 'transfer'
    and (
      lower(o.delivery_address->>'email') = lower(trim(p_contact))
      or regexp_replace(o.delivery_address->>'phone', '\D', '', 'g') = regexp_replace(p_contact, '\D', '', 'g')
      or (o.user_id is not null and o.user_id = auth.uid())
    )
  for update of r;

  if not found then
    return false;
  end if;

  if not exists (
    select 1 from storage.objects
    where bucket_id = 'payment-receipts'
      and name = v_receipt.storage_path
  ) then
    return false;
  end if;

  update public.payment_receipts
  set
    status = 'pending_review',
    uploaded_at = timezone('utc', now()),
    updated_at = timezone('utc', now())
  where id = v_receipt.id;

  return true;
end;
$$;

revoke all on function public.prepare_payment_receipt_upload(text, text, text, text, bigint) from public;
revoke all on function public.finalize_payment_receipt_upload(text, text, uuid) from public;
grant execute on function public.prepare_payment_receipt_upload(text, text, text, text, bigint) to anon, authenticated;
grant execute on function public.finalize_payment_receipt_upload(text, text, uuid) to anon, authenticated;

create trigger set_payment_receipts_updated_at
before update on public.payment_receipts
for each row execute function public.set_updated_at();

alter publication supabase_realtime add table public.payment_receipts;

commit;
