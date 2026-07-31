create table if not exists public.payment_partners (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(trim(name)) between 1 and 120),
  logo_url text,
  is_active boolean not null default true,
  is_default boolean not null default false,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists payment_partners_one_default_idx
  on public.payment_partners (is_default)
  where is_default and is_active;

create index if not exists payment_partners_public_order_idx
  on public.payment_partners (is_active, is_default desc, sort_order, name);

drop trigger if exists set_payment_partners_updated_at on public.payment_partners;
create trigger set_payment_partners_updated_at
before update on public.payment_partners
for each row execute function public.set_updated_at();

alter table public.payment_partners enable row level security;

drop policy if exists payment_partners_public_read on public.payment_partners;
create policy payment_partners_public_read
on public.payment_partners
for select
to anon, authenticated
using (is_active);

drop policy if exists payment_partners_admin_read on public.payment_partners;
create policy payment_partners_admin_read
on public.payment_partners
for select
to authenticated
using ((select public.is_admin()));

drop policy if exists payment_partners_admin_insert on public.payment_partners;
create policy payment_partners_admin_insert
on public.payment_partners
for insert
to authenticated
with check ((select public.is_admin()));

drop policy if exists payment_partners_admin_update on public.payment_partners;
create policy payment_partners_admin_update
on public.payment_partners
for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists payment_partners_admin_delete on public.payment_partners;
create policy payment_partners_admin_delete
on public.payment_partners
for delete
to authenticated
using ((select public.is_admin()));

create or replace function public.set_default_payment_partner(p_partner_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.payment_partners
    where id = p_partner_id and is_active
  ) then
    return false;
  end if;

  update public.payment_partners set is_default = false where is_default;
  update public.payment_partners set is_default = true where id = p_partner_id;
  return true;
end;
$$;

revoke all on public.payment_partners from anon, authenticated;
grant select on public.payment_partners to anon, authenticated;
grant insert, update, delete on public.payment_partners to authenticated;

revoke all on function public.set_default_payment_partner(uuid) from public, anon;
grant execute on function public.set_default_payment_partner(uuid) to authenticated;

insert into public.payment_partners (name, logo_url, is_active, sort_order)
values
  ('Visa', '/payment-partners/visa.svg', true, 10),
  ('Mastercard', '/payment-partners/mastercard.svg', true, 20),
  ('American Express', '/payment-partners/american-express.svg', true, 30),
  ('Troy', '/payment-partners/troy.svg', true, 40),
  ('Bonus', '/payment-partners/bonus.svg', true, 50),
  ('World', '/payment-partners/world.svg', true, 60),
  ('Maximum', '/payment-partners/maximum.svg', true, 70),
  ('Axess', '/payment-partners/axess.svg', true, 80)
on conflict (name) do nothing;

notify pgrst, 'reload schema';
