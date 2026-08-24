begin;

create table public.installment_application_blocks (
  id uuid primary key default gen_random_uuid(),
  source_application_id uuid not null unique
    references public.installment_applications(id)
    on update cascade on delete restrict,
  user_id uuid references auth.users(id)
    on update cascade on delete set null,
  phone_e164 text not null check (phone_e164 ~ '^\+905[0-9]{9}$'),
  reason text not null check (reason in ('payment_deadline_expired')),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id)
    on update cascade on delete set null,
  check (
    (revoked_at is null and revoked_by is null)
    or revoked_at is not null
  )
);

comment on table public.installment_application_blocks is
  'Server-only, auditable blocks for repeat installment applications after an unpaid customer deadline.';
comment on column public.installment_application_blocks.phone_e164 is
  'Normalized phone identity used only to prevent another installment application while the block is active.';

create unique index installment_application_blocks_active_phone_idx
  on public.installment_application_blocks(phone_e164)
  where revoked_at is null;
create unique index installment_application_blocks_active_user_idx
  on public.installment_application_blocks(user_id)
  where user_id is not null and revoked_at is null;
create index installment_application_blocks_revoked_by_idx
  on public.installment_application_blocks(revoked_by)
  where revoked_by is not null;

alter table public.installment_application_blocks enable row level security;
alter table public.installment_application_blocks force row level security;

revoke all on public.installment_application_blocks
  from public, anon, authenticated;
grant select, insert, update on public.installment_application_blocks
  to service_role;

alter table public.installment_customer_portals
  add column cancellation_reason text,
  add column cancelled_at timestamptz;

alter table public.installment_customer_portals
  add constraint installment_customer_portals_cancellation_check
  check (
    (
      cancellation_reason is null
      and cancelled_at is null
    )
    or (
      stage = 'cancelled'
      and cancellation_reason in (
        'payment_deadline_expired',
        'admin_cancelled'
      )
      and cancelled_at is not null
    )
  );

comment on column public.installment_customer_portals.cancellation_reason is
  'Machine-readable reason for a terminal portal cancellation.';
comment on column public.installment_customer_portals.cancelled_at is
  'Server timestamp when the portal entered a terminal cancelled state.';

create index installment_customer_portals_pending_due_idx
  on public.installment_customer_portals(payment_due_at, id)
  where stage = 'down_payment_pending'
    and payment_due_at is not null;

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
    'portal.receipt_uploaded','portal.receipt_approved','portal.receipt_rejected',
    'portal.payment_deadline_expired'
  ));

create function public.expire_overdue_installment_portals(
  p_portal_id uuid default null,
  p_phone_e164 text default null
) returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_record record;
  v_expired_count integer := 0;
begin
  if (p_portal_id is null) = (p_phone_e164 is null) then
    raise exception 'exactly_one_expiry_selector_required';
  end if;
  if p_phone_e164 is not null
    and p_phone_e164 !~ '^\+905[0-9]{9}$' then
    raise exception 'invalid_phone';
  end if;

  for v_record in
    select
      portal.id as portal_id,
      portal.application_id,
      application.application_number,
      application.user_id,
      application.phone_e164,
      portal.payment_due_at
    from public.installment_customer_portals portal
    join public.installment_applications application
      on application.id = portal.application_id
    where portal.stage = 'down_payment_pending'
      and portal.payment_due_at is not null
      and portal.payment_due_at <= now()
      and application.status = 'approved'
      and (
        (p_portal_id is not null and portal.id = p_portal_id)
        or (
          p_phone_e164 is not null
          and application.phone_e164 = p_phone_e164
        )
      )
      and not exists (
        select 1
        from public.installment_payment_receipts receipt
        where receipt.portal_id = portal.id
          and receipt.status in ('pending_review', 'approved')
      )
    order by portal.id
    for update of portal, application skip locked
  loop
    update public.installment_customer_portals
    set stage = 'cancelled',
        cancellation_reason = 'payment_deadline_expired',
        cancelled_at = now(),
        public_note = null
    where id = v_record.portal_id;

    update public.installment_applications
    set status = 'cancelled',
        revision = revision + 1
    where id = v_record.application_id
      and status = 'approved';

    insert into public.installment_application_blocks (
      source_application_id,
      user_id,
      phone_e164,
      reason
    ) values (
      v_record.application_id,
      v_record.user_id,
      v_record.phone_e164,
      'payment_deadline_expired'
    )
    on conflict do nothing;

    insert into public.installment_application_events (
      application_id,
      event_type,
      actor_type,
      metadata
    ) values (
      v_record.application_id,
      'portal.payment_deadline_expired',
      'system',
      jsonb_build_object(
        'portal_id', v_record.portal_id,
        'payment_due_at', v_record.payment_due_at,
        'repeat_installment_application_blocked', true
      )
    );

    v_expired_count := v_expired_count + 1;
  end loop;

  return v_expired_count;
end;
$$;

revoke all on function public.expire_overdue_installment_portals(uuid, text)
  from public, anon, authenticated;
grant execute on function public.expire_overdue_installment_portals(uuid, text)
  to service_role;

notify pgrst, 'reload schema';

commit;
