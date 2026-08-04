begin;

create table public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  author_name text not null check (char_length(trim(author_name)) between 2 and 80),
  rating smallint not null check (rating between 1 and 5),
  title text check (title is null or char_length(trim(title)) between 2 and 120),
  body text not null check (char_length(trim(body)) between 10 and 2000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  is_admin_created boolean not null default false,
  admin_reply text check (admin_reply is null or char_length(trim(admin_reply)) between 2 and 2000),
  replied_at timestamptz,
  replied_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint product_reviews_reply_consistency check (
    (admin_reply is null and replied_at is null and replied_by is null)
    or (admin_reply is not null and replied_at is not null and replied_by is not null)
  )
);

create unique index product_reviews_customer_product_uidx
  on public.product_reviews(product_id, user_id)
  where user_id is not null and is_admin_created = false;
create index product_reviews_product_approved_idx
  on public.product_reviews(product_id, created_at desc)
  where status = 'approved';
create index product_reviews_user_id_idx on public.product_reviews(user_id);
create index product_reviews_status_created_idx on public.product_reviews(status, created_at desc);
create index product_reviews_replied_by_idx
  on public.product_reviews(replied_by)
  where replied_by is not null;

create trigger set_product_reviews_updated_at
before update on public.product_reviews
for each row execute function public.set_updated_at();

create or replace function public.refresh_product_review_summary(p_product_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.products
  set
    rating = coalesce((
      select round(avg(r.rating)::numeric, 1)
      from public.product_reviews r
      where r.product_id = p_product_id and r.status = 'approved'
    ), 0),
    review_count = (
      select count(*)::integer
      from public.product_reviews r
      where r.product_id = p_product_id and r.status = 'approved'
    )
  where id = p_product_id;
$$;

revoke all on function public.refresh_product_review_summary(uuid) from public, anon, authenticated;

create or replace function public.sync_product_review_summary()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.refresh_product_review_summary(coalesce(new.product_id, old.product_id));
  if tg_op = 'UPDATE' and old.product_id is distinct from new.product_id then
    perform public.refresh_product_review_summary(old.product_id);
  end if;
  return coalesce(new, old);
end;
$$;

revoke all on function public.sync_product_review_summary() from public, anon, authenticated;

create trigger sync_product_review_summary_after_change
after insert or update or delete on public.product_reviews
for each row execute function public.sync_product_review_summary();

create or replace function public.submit_product_review(
  p_product_id uuid,
  p_rating smallint,
  p_title text,
  p_body text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_author_name text;
  v_review_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication_required';
  end if;
  if p_rating not between 1 and 5 then
    raise exception 'invalid_rating';
  end if;
  if char_length(trim(coalesce(p_body, ''))) not between 10 and 2000 then
    raise exception 'invalid_review_body';
  end if;
  if nullif(trim(coalesce(p_title, '')), '') is not null
     and char_length(trim(p_title)) not between 2 and 120 then
    raise exception 'invalid_review_title';
  end if;
  if not exists (select 1 from public.products where id = p_product_id and is_active = true) then
    raise exception 'product_not_found';
  end if;

  select nullif(trim(concat_ws(' ', first_name, last_name)), '')
  into v_author_name
  from public.profiles
  where id = v_user_id;

  insert into public.product_reviews (
    product_id, user_id, author_name, rating, title, body, status, is_admin_created
  ) values (
    p_product_id,
    v_user_id,
    coalesce(v_author_name, 'CENTER GSM Müşterisi'),
    p_rating,
    nullif(trim(coalesce(p_title, '')), ''),
    trim(p_body),
    'pending',
    false
  )
  returning id into v_review_id;

  return v_review_id;
exception
  when unique_violation then
    raise exception 'review_already_exists';
end;
$$;

revoke all on function public.submit_product_review(uuid, smallint, text, text) from public, anon;
grant execute on function public.submit_product_review(uuid, smallint, text, text) to authenticated;

create or replace function public.admin_create_product_review(
  p_product_id uuid,
  p_author_name text,
  p_rating smallint,
  p_title text,
  p_body text,
  p_status text default 'approved'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_review_id uuid;
begin
  if not public.current_user_is_admin() then
    raise exception 'forbidden';
  end if;
  if char_length(trim(coalesce(p_author_name, ''))) not between 2 and 80
     or p_rating not between 1 and 5
     or char_length(trim(coalesce(p_body, ''))) not between 10 and 2000
     or p_status not in ('pending', 'approved', 'rejected') then
    raise exception 'invalid_review';
  end if;

  insert into public.product_reviews (
    product_id, author_name, rating, title, body, status, is_admin_created
  ) values (
    p_product_id,
    trim(p_author_name),
    p_rating,
    nullif(trim(coalesce(p_title, '')), ''),
    trim(p_body),
    p_status,
    true
  )
  returning id into v_review_id;

  return v_review_id;
end;
$$;

revoke all on function public.admin_create_product_review(uuid, text, smallint, text, text, text) from public, anon;
grant execute on function public.admin_create_product_review(uuid, text, smallint, text, text, text) to authenticated;

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
      update public.product_reviews set status = 'rejected' where id = p_review_id;
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

revoke all on function public.admin_manage_product_review(uuid, text, text) from public, anon;
grant execute on function public.admin_manage_product_review(uuid, text, text) to authenticated;

alter table public.product_reviews enable row level security;

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

grant select on public.product_reviews to anon, authenticated;
grant insert, update, delete on public.product_reviews to service_role;

commit;
