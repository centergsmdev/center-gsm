begin;

create index if not exists installment_customer_portals_payment_account_idx
  on public.installment_customer_portals(payment_account_id)
  where payment_account_id is not null;

create index if not exists installment_customer_portals_updated_by_idx
  on public.installment_customer_portals(updated_by)
  where updated_by is not null;

commit;
