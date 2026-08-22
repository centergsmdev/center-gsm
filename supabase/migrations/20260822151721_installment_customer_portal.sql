begin;

create table public.installment_customer_portals (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references public.installment_applications(id)
    on update cascade on delete cascade,
  payment_account_id uuid references public.payment_accounts(id)
    on update cascade on delete set null,
  payment_account_snapshot jsonb not null check (
    jsonb_typeof(payment_account_snapshot) = 'object'
    and char_length(trim(coalesce(payment_account_snapshot ->> 'bank_name', ''))) between 2 and 120
    and char_length(trim(coalesce(payment_account_snapshot ->> 'account_holder', ''))) between 2 and 160
    and coalesce(payment_account_snapshot ->> 'iban', '') ~ '^TR[0-9]{24}$'
  ),
  stage text not null default 'down_payment_pending' check (stage in (
    'down_payment_pending',
    'payment_under_review',
    'payment_confirmed',
    'preparing_delivery',
    'completed',
    'cancelled'
  )),
  public_note text check (
    public_note is null or char_length(public_note) <= 600
  ),
  payment_due_at timestamptz,
  access_version integer not null default 1 check (
    access_version between 1 and 1000000000
  ),
  access_expires_at timestamptz not null,
  created_by uuid references auth.users(id) on update cascade on delete set null,
  updated_by uuid references auth.users(id) on update cascade on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (access_expires_at > created_at)
);

comment on table public.installment_customer_portals is
  'Revocable customer tracking portal. Payment account data is snapshotted; access is server-side only.';
comment on column public.installment_customer_portals.payment_account_snapshot is
  'Immutable-at-selection bank account details shown to the customer; never read directly from the browser.';
comment on column public.installment_customer_portals.access_version is
  'Incrementing nonce used to invalidate previously issued signed access links.';

create index installment_customer_portals_stage_idx
  on public.installment_customer_portals(stage, updated_at desc);
create index installment_customer_portals_expiry_idx
  on public.installment_customer_portals(access_expires_at);
create index installment_customer_portals_created_by_idx
  on public.installment_customer_portals(created_by)
  where created_by is not null;

create trigger set_installment_customer_portals_updated_at
before update on public.installment_customer_portals
for each row execute function public.set_updated_at();

alter table public.installment_customer_portals enable row level security;

revoke all on public.installment_customer_portals
  from public, anon, authenticated;
grant select, insert, update on public.installment_customer_portals
  to service_role;

alter table public.installment_application_events
  drop constraint installment_application_events_event_type_check;
alter table public.installment_application_events
  add constraint installment_application_events_event_type_check
  check (event_type in (
    'application.created','application.submitted','application.review_started',
    'application.approved','application.rejected','application.cancelled',
    'application.status_changed','document.uploaded','document.viewed',
    'document.downloaded','portal.created','portal.stage_changed',
    'portal.access_renewed','portal.payment_account_updated'
  ));

notify pgrst, 'reload schema';

commit;
