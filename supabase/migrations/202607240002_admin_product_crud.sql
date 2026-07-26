begin;

create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

grant execute on function public.is_admin() to authenticated;

create policy "Admins can read all categories"
on public.categories for select to authenticated
using ((select public.is_admin()));

create policy "Admins can read all brands"
on public.brands for select to authenticated
using ((select public.is_admin()));

create policy "Admins can read all products"
on public.products for select to authenticated
using ((select public.is_admin()));

create policy "Admins can create products"
on public.products for insert to authenticated
with check ((select public.is_admin()));

create policy "Admins can update products"
on public.products for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "Admins can read all product images"
on public.product_images for select to authenticated
using ((select public.is_admin()));

create policy "Admins can manage product images"
on public.product_images for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

grant insert, update on public.products to authenticated;
grant insert, update, delete on public.product_images to authenticated;

commit;
