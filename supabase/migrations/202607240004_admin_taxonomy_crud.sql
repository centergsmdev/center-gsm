begin;

alter table public.categories
add column if not exists image_url text;

create policy "Admins can create categories"
on public.categories for insert to authenticated
with check ((select public.is_admin()));

create policy "Admins can update categories"
on public.categories for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "Admins can create brands"
on public.brands for insert to authenticated
with check ((select public.is_admin()));

create policy "Admins can update brands"
on public.brands for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

grant insert, update on public.categories, public.brands to authenticated;

commit;
