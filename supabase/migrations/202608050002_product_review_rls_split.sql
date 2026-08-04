begin;

drop policy if exists product_reviews_public_read on public.product_reviews;
drop policy if exists product_reviews_approved_read on public.product_reviews;
drop policy if exists product_reviews_customer_own_read on public.product_reviews;
drop policy if exists product_reviews_admin_read on public.product_reviews;

create policy product_reviews_approved_read
on public.product_reviews for select
to anon, authenticated
using (status = 'approved');

create policy product_reviews_customer_own_read
on public.product_reviews for select
to authenticated
using (user_id = (select auth.uid()));

create policy product_reviews_admin_read
on public.product_reviews for select
to authenticated
using ((select public.current_user_is_admin()));

commit;
