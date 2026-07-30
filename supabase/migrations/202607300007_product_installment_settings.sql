begin;

alter table public.products
  add column if not exists show_installments boolean not null default false,
  add column if not exists installment_count smallint not null default 3,
  add column if not exists installment_note text;

update public.products
set show_installments = false
where show_installments is null;

update public.products
set installment_count = 3
where installment_count is null
   or installment_count not in (2, 3, 4, 5, 6, 9, 12, 18, 24, 36);

alter table public.products
  alter column show_installments set default false,
  alter column show_installments set not null,
  alter column installment_count set default 3,
  alter column installment_count set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_installment_count_check'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_installment_count_check
      check (installment_count in (2, 3, 4, 5, 6, 9, 12, 18, 24, 36));
  end if;
end;
$$;

notify pgrst, 'reload schema';

commit;
