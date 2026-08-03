begin;

alter table public.orders
  drop constraint if exists orders_payment_status_check;

alter table public.orders
  add constraint orders_payment_status_check
  check (
    payment_status in (
      'pending',
      'authorized',
      'awaiting_payment',
      'awaiting_phone_approval',
      'customer_unreachable',
      'paid',
      'failed',
      'cancelled',
      'refunded'
    )
  );

alter table public.payment_transactions
  drop constraint if exists payment_transactions_status_check;

alter table public.payment_transactions
  add constraint payment_transactions_status_check
  check (
    status in (
      'pending',
      'awaiting_payment',
      'awaiting_phone_approval',
      'customer_unreachable',
      'paid',
      'failed',
      'cancelled',
      'refunded'
    )
  );

notify pgrst, 'reload schema';

commit;
