begin;

alter table public.installment_applications
  add column down_payment_timing text,
  add column down_payment_timing_date date,
  add column down_payment_timing_selected_at timestamptz;

alter table public.installment_applications
  add constraint installment_applications_down_payment_commitment_check
  check (
    (
      down_payment_timing is null
      and down_payment_timing_date is null
      and down_payment_timing_selected_at is null
    )
    or (
      down_payment_timing in ('immediate', 'today_12_15', 'today_15_18')
      and down_payment_timing_date is not null
      and down_payment_timing_selected_at is not null
    )
  );

comment on column public.installment_applications.down_payment_timing is
  'Customer-selected same-day down-payment readiness window. New applications require a server-validated value.';
comment on column public.installment_applications.down_payment_timing_date is
  'Europe/Istanbul calendar date associated with the customer payment commitment.';
comment on column public.installment_applications.down_payment_timing_selected_at is
  'Server timestamp when the customer payment commitment was recorded.';

notify pgrst, 'reload schema';

commit;
