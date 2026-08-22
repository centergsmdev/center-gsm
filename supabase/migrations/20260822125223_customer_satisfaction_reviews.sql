begin;

alter table public.product_reviews
  add column if not exists is_featured boolean not null default false;

create index if not exists product_reviews_featured_approved_idx
  on public.product_reviews (created_at desc)
  where status = 'approved' and is_featured = true;

create or replace view public.customer_satisfaction_reviews
with (security_invoker = true)
as
select
  review.id,
  review.product_id,
  review.author_name,
  review.rating,
  review.title,
  review.body,
  review.image_paths,
  review.admin_reply,
  review.replied_at,
  review.created_at,
  review.is_featured,
  product.name as product_name,
  product.slug as product_slug,
  product_image.url as product_image_url,
  (
    review.user_id is not null
    and exists (
      select 1
      from public.orders customer_order
      join public.order_items order_item
        on order_item.order_id = customer_order.id
      where customer_order.user_id = review.user_id
        and order_item.product_id = review.product_id
        and (
          customer_order.status = 'delivered'
          or customer_order.fulfillment_status = 'delivered'
        )
    )
  ) as verified_purchase
from public.product_reviews review
join public.products product on product.id = review.product_id
left join lateral (
  select image.url
  from public.product_images image
  where image.product_id = review.product_id
  order by image.is_primary desc, image.sort_order, image.created_at
  limit 1
) product_image on true
where review.status = 'approved';

create or replace view public.customer_satisfaction_review_summary
with (security_invoker = true)
as
select
  count(*)::integer as total_count,
  coalesce(round(avg(review.rating)::numeric, 2), 0) as average_rating,
  count(*) filter (where review.rating = 1)::integer as rating_1_count,
  count(*) filter (where review.rating = 2)::integer as rating_2_count,
  count(*) filter (where review.rating = 3)::integer as rating_3_count,
  count(*) filter (where review.rating = 4)::integer as rating_4_count,
  count(*) filter (where review.rating = 5)::integer as rating_5_count,
  count(*) filter (where cardinality(review.image_paths) > 0)::integer as photo_count,
  count(*) filter (where review.verified_purchase)::integer as verified_count
from public.customer_satisfaction_reviews review;

revoke all on public.customer_satisfaction_reviews from public, anon, authenticated;
revoke all on public.customer_satisfaction_review_summary from public, anon, authenticated;
grant select on public.customer_satisfaction_reviews to service_role;
grant select on public.customer_satisfaction_review_summary to service_role;

create or replace function public.admin_manage_product_review(
  p_review_id uuid,
  p_action text,
  p_reply text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.current_user_is_admin() then
    raise exception 'forbidden';
  end if;

  case p_action
    when 'approve' then
      update public.product_reviews set status = 'approved' where id = p_review_id;
    when 'reject' then
      update public.product_reviews
      set status = 'rejected', is_featured = false
      where id = p_review_id;
    when 'reply' then
      if char_length(trim(coalesce(p_reply, ''))) not between 2 and 2000 then
        raise exception 'invalid_reply';
      end if;
      update public.product_reviews
      set admin_reply = trim(p_reply), replied_at = timezone('utc', now()), replied_by = auth.uid()
      where id = p_review_id;
    when 'clear_reply' then
      update public.product_reviews
      set admin_reply = null, replied_at = null, replied_by = null
      where id = p_review_id;
    when 'feature' then
      if not exists (
        select 1 from public.product_reviews
        where id = p_review_id and status = 'approved'
      ) then
        raise exception 'review_not_approved';
      end if;
      update public.product_reviews set is_featured = true where id = p_review_id;
    when 'unfeature' then
      update public.product_reviews set is_featured = false where id = p_review_id;
    when 'delete' then
      delete from public.product_reviews where id = p_review_id;
    else
      raise exception 'invalid_action';
  end case;

  if not found then
    raise exception 'review_not_found';
  end if;
  return true;
end;
$$;

revoke all on function public.admin_manage_product_review(uuid, text, text)
  from public, anon;
grant execute on function public.admin_manage_product_review(uuid, text, text)
  to authenticated;

commit;
