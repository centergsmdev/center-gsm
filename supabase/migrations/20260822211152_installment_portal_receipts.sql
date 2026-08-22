begin;

create table public.installment_payment_receipts (
  id uuid primary key default gen_random_uuid(),
  portal_id uuid not null references public.installment_customer_portals(id)
    on update cascade on delete cascade,
  application_id uuid not null references public.installment_applications(id)
    on update cascade on delete cascade,
  payment_account_id uuid references public.payment_accounts(id)
    on update cascade on delete set null,
  amount_minor bigint not null check (amount_minor > 0),
  storage_path text not null unique check (
    storage_path ~ '^installment/[0-9a-f-]{36}/[0-9a-f-]{36}\.(webp|pdf)$'
  ),
  original_name text not null check (char_length(original_name) between 1 and 180),
  mime_type text not null check (mime_type in ('image/webp', 'application/pdf')),
  size_bytes bigint not null check (size_bytes between 1 and 10485760),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  status text not null default 'pending_review' check (
    status in ('pending_review', 'approved', 'rejected')
  ),
  rejection_reason_public text check (
    rejection_reason_public is null
    or char_length(rejection_reason_public) between 3 and 500
  ),
  uploaded_at timestamptz not null default timezone('utc', now()),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on update cascade on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (
    (status = 'pending_review' and reviewed_at is null and reviewed_by is null)
    or (status in ('approved', 'rejected') and reviewed_at is not null and reviewed_by is not null)
  ),
  check (
    (status = 'rejected' and rejection_reason_public is not null)
    or (status <> 'rejected' and rejection_reason_public is null)
  )
);

comment on table public.installment_payment_receipts is
  'Private down-payment receipts uploaded through a signed installment customer portal.';

create unique index installment_payment_receipts_one_active_portal_idx
  on public.installment_payment_receipts(portal_id)
  where status in ('pending_review', 'approved');
create index installment_payment_receipts_status_created_idx
  on public.installment_payment_receipts(status, created_at desc);
create index installment_payment_receipts_application_idx
  on public.installment_payment_receipts(application_id, created_at desc);
create index installment_payment_receipts_payment_account_idx
  on public.installment_payment_receipts(payment_account_id)
  where payment_account_id is not null;
create index installment_payment_receipts_reviewed_by_idx
  on public.installment_payment_receipts(reviewed_by)
  where reviewed_by is not null;

create trigger set_installment_payment_receipts_updated_at
before update on public.installment_payment_receipts
for each row execute function public.set_updated_at();

alter table public.installment_payment_receipts enable row level security;

revoke all on public.installment_payment_receipts
  from public, anon, authenticated;
grant select on public.installment_payment_receipts to authenticated;
grant select, insert, update, delete on public.installment_payment_receipts
  to service_role;

create policy "Admins view installment payment receipts"
on public.installment_payment_receipts
for select to authenticated
using (public.is_admin());

create or replace function public.admin_review_installment_payment_receipt(
  p_receipt_id uuid,
  p_status text,
  p_rejection_reason text default null
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_receipt public.installment_payment_receipts%rowtype;
begin
  if not public.is_admin() then
    raise exception 'admin_required';
  end if;
  if p_status not in ('approved', 'rejected') then
    raise exception 'invalid_receipt_status';
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
      reviewed_by = auth.uid()
  where id = p_receipt_id;

  update public.installment_customer_portals
  set stage = case
        when p_status = 'approved' then 'payment_confirmed'
        else 'down_payment_pending'
      end,
      updated_by = auth.uid()
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
    auth.uid(),
    jsonb_build_object(
      'portal_id', v_receipt.portal_id,
      'receipt_id', v_receipt.id,
      'amount_minor', v_receipt.amount_minor
    )
  );
end;
$$;

revoke all on function public.admin_review_installment_payment_receipt(uuid, text, text)
  from public, anon;
grant execute on function public.admin_review_installment_payment_receipt(uuid, text, text)
  to authenticated, service_role;

alter table public.installment_application_events
  drop constraint installment_application_events_event_type_check;
alter table public.installment_application_events
  add constraint installment_application_events_event_type_check
  check (event_type in (
    'application.created','application.submitted','application.review_started',
    'application.approved','application.rejected','application.cancelled',
    'application.status_changed','document.uploaded','document.viewed',
    'document.downloaded','portal.created','portal.stage_changed',
    'portal.access_renewed','portal.payment_account_updated',
    'portal.receipt_uploaded','portal.receipt_approved','portal.receipt_rejected'
  ));

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'installment_payment_receipts'
  ) then
    alter publication supabase_realtime
      add table public.installment_payment_receipts;
  end if;
end $$;

notify pgrst, 'reload schema';

commit;
