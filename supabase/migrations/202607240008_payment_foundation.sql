begin;

create table public.payment_accounts (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'manual_bank_transfer' check (provider = 'manual_bank_transfer'),
  bank_name text not null check (length(trim(bank_name)) > 0),
  account_holder text not null check (length(trim(account_holder)) > 0),
  iban text not null unique check (iban ~ '^TR[0-9]{24}$'),
  branch text,
  description text,
  is_active boolean not null default true,
  is_default boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on update cascade on delete cascade,
  payment_account_id uuid references public.payment_accounts(id) on update cascade on delete set null,
  provider text not null,
  transaction_type text not null default 'payment' check (transaction_type in ('payment','cancel','refund')),
  status text not null check (status in ('pending','awaiting_payment','paid','failed','cancelled','refunded')),
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'TRY' check (currency = 'TRY'),
  reference text not null,
  provider_reference text,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.orders add column if not exists expected_payment numeric(12,2) not null default 0 check (expected_payment >= 0);
alter table public.orders add column if not exists payment_note text;
alter table public.orders add column if not exists payment_account_snapshot jsonb;

create unique index payment_accounts_one_default_idx on public.payment_accounts(is_default) where is_default and is_active;
create index payment_accounts_active_idx on public.payment_accounts(is_active, is_default);
create index payment_transactions_order_idx on public.payment_transactions(order_id, created_at desc);
create index payment_transactions_status_idx on public.payment_transactions(status);
create unique index payment_transactions_initial_payment_idx on public.payment_transactions(order_id) where transaction_type='payment';

create trigger set_payment_accounts_updated_at before update on public.payment_accounts for each row execute function public.set_updated_at();
create trigger set_payment_transactions_updated_at before update on public.payment_transactions for each row execute function public.set_updated_at();

alter table public.payment_accounts enable row level security;
alter table public.payment_transactions enable row level security;
create policy "Public can read active payment accounts" on public.payment_accounts for select to anon, authenticated using (is_active);
create policy "Admins can read all payment accounts" on public.payment_accounts for select to authenticated using ((select public.is_admin()));
create policy "Admins can create payment accounts" on public.payment_accounts for insert to authenticated with check ((select public.is_admin()));
create policy "Admins can update payment accounts" on public.payment_accounts for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins can delete payment accounts" on public.payment_accounts for delete to authenticated using ((select public.is_admin()));
create policy "Users can read own payment transactions" on public.payment_transactions for select to authenticated using (exists(select 1 from public.orders o where o.id=order_id and o.user_id=(select auth.uid())));
create policy "Admins can read payment transactions" on public.payment_transactions for select to authenticated using ((select public.is_admin()));
create policy "Admins can update payment transactions" on public.payment_transactions for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

revoke all on public.payment_accounts, public.payment_transactions from anon, authenticated;
grant select on public.payment_accounts to anon, authenticated;
grant select, insert, update, delete on public.payment_accounts to authenticated;
grant select, update on public.payment_transactions to authenticated;

create or replace function public.prepare_order_payment()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_account public.payment_accounts%rowtype;
begin
  new.expected_payment := new.grand_total;
  if new.payment_method='transfer' then
    select * into v_account from public.payment_accounts where is_active order by is_default desc, created_at limit 1;
    if not found then raise exception 'bank_account_unavailable'; end if;
    new.payment_status := 'awaiting_payment';
    new.payment_note := 'Havale açıklamasına sipariş numarasını yazınız: '||new.order_number;
    new.payment_account_snapshot := jsonb_build_object('id',v_account.id,'provider',v_account.provider,'bank_name',v_account.bank_name,'account_holder',v_account.account_holder,'iban',v_account.iban,'branch',v_account.branch,'description',v_account.description);
  elsif new.payment_method='cash' then
    new.payment_status := 'pending'; new.payment_note := 'Ödeme teslimat sırasında tahsil edilecektir.'; new.payment_account_snapshot := null;
  elsif new.payment_method='card' then
    raise exception 'payment_method_unavailable';
  end if;
  return new;
end;
$$;

create trigger prepare_order_payment_before_insert before insert on public.orders for each row execute function public.prepare_order_payment();

create or replace function public.record_initial_payment()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.payment_transactions(order_id,payment_account_id,provider,status,amount,reference,note,metadata)
  values(new.id,case when new.payment_account_snapshot is null then null else (new.payment_account_snapshot->>'id')::uuid end,case when new.payment_method='transfer' then 'manual_bank_transfer' else 'cash_on_delivery' end,new.payment_status,new.expected_payment,new.order_number,new.payment_note,jsonb_build_object('payment_method',new.payment_method));
  return new;
end;
$$;
create trigger record_initial_payment_after_insert after insert on public.orders for each row execute function public.record_initial_payment();

create or replace function public.admin_set_default_payment_account(p_account_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if not exists(select 1 from public.payment_accounts where id=p_account_id and is_active) then return false; end if;
  update public.payment_accounts set is_default=false where is_default;
  update public.payment_accounts set is_default=true where id=p_account_id;
  return true;
end;
$$;

create or replace function public.admin_update_order(p_order_id uuid, p_status text, p_payment_status text, p_note text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_history jsonb; v_current text; v_current_payment text;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if p_status not in ('received','preparing','shipped','delivered','cancelled') then raise exception 'invalid_status'; end if;
  if p_payment_status not in ('pending','awaiting_payment','paid','failed','cancelled','refunded') then raise exception 'invalid_payment_status'; end if;
  select status,payment_status,status_history into v_current,v_current_payment,v_history from public.orders where id=p_order_id for update;
  if not found then return false; end if;
  if v_current<>p_status then v_history:=coalesce(v_history,'[]'::jsonb)||jsonb_build_array(jsonb_build_object('status',p_status,'label',case p_status when 'received' then 'Sipariş alındı' when 'preparing' then 'Hazırlanıyor' when 'shipped' then 'Kargoya verildi' when 'delivered' then 'Teslim edildi' else 'İptal edildi' end,'at',timezone('utc',now()))); end if;
  if v_current_payment<>p_payment_status then v_history:=coalesce(v_history,'[]'::jsonb)||jsonb_build_array(jsonb_build_object('status','payment:'||p_payment_status,'label',case p_payment_status when 'pending' then 'Ödeme bekliyor' when 'awaiting_payment' then 'Havale bekleniyor' when 'paid' then 'Ödeme alındı' when 'failed' then 'Ödeme başarısız' when 'cancelled' then 'Ödeme iptal edildi' else 'Ödeme iade edildi' end,'at',timezone('utc',now()))); end if;
  update public.orders set status=p_status,payment_status=p_payment_status,admin_note=nullif(trim(p_note),''),status_history=v_history where id=p_order_id;
  update public.payment_transactions set status=p_payment_status,note=coalesce(nullif(trim(p_note),''),note) where order_id=p_order_id and transaction_type='payment';
  return true;
end;
$$;

revoke all on function public.admin_set_default_payment_account(uuid) from public;
revoke all on function public.admin_update_order(uuid,text,text,text) from public;
grant execute on function public.admin_set_default_payment_account(uuid) to authenticated;
grant execute on function public.admin_update_order(uuid,text,text,text) to authenticated;

commit;
