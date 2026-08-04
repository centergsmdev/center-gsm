begin;

drop policy if exists product_reviews_approved_read on public.product_reviews;
drop policy if exists product_reviews_customer_own_read on public.product_reviews;
drop policy if exists product_reviews_admin_read on public.product_reviews;

create policy product_reviews_approved_read
on public.product_reviews for select
to anon
using (status = 'approved');

create policy product_reviews_authenticated_read
on public.product_reviews for select
to authenticated
using (
  status = 'approved'
  or user_id = (select auth.uid())
  or (select public.current_user_is_admin())
);

commit;
