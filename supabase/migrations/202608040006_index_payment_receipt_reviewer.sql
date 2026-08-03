begin;

create index payment_receipts_reviewed_by_idx
  on public.payment_receipts(reviewed_by)
  where reviewed_by is not null;

commit;
