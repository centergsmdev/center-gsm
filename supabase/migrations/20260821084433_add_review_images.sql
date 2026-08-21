begin;

alter table public.product_reviews
  add column image_paths text[] not null default '{}'::text[];

alter table public.product_reviews
  add constraint product_reviews_image_count_check
  check (cardinality(image_paths) between 0 and 3);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'review-images',
  'review-images',
  true,
  5242880,
  array['image/webp']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.submit_product_review_with_images(
  p_product_id uuid,
  p_rating smallint,
  p_title text,
  p_body text,
  p_image_paths text[] default '{}'::text[]
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
  v_path text;
  v_image_paths text[] := coalesce(p_image_paths, '{}'::text[]);
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
  if cardinality(v_image_paths) > 3 then
    raise exception 'too_many_review_images';
  end if;
  if not exists (
    select 1 from public.products where id = p_product_id and is_active = true
  ) then
    raise exception 'product_not_found';
  end if;

  foreach v_path in array v_image_paths loop
    if v_path !~ ('^customers/' || v_user_id::text || '/[0-9a-f-]{36}\.webp$')
       or not exists (
         select 1
         from storage.objects
         where bucket_id = 'review-images' and name = v_path
       ) then
      raise exception 'invalid_review_image';
    end if;
  end loop;

  select nullif(trim(concat_ws(' ', first_name, last_name)), '')
  into v_author_name
  from public.profiles
  where id = v_user_id;

  insert into public.product_reviews (
    product_id,
    user_id,
    author_name,
    rating,
    title,
    body,
    status,
    is_admin_created,
    image_paths
  ) values (
    p_product_id,
    v_user_id,
    coalesce(v_author_name, 'CENTER GSM Müşterisi'),
    p_rating,
    nullif(trim(coalesce(p_title, '')), ''),
    trim(p_body),
    'pending',
    false,
    v_image_paths
  )
  returning id into v_review_id;

  return v_review_id;
exception
  when unique_violation then
    raise exception 'review_already_exists';
end;
$$;

revoke all on function public.submit_product_review_with_images(uuid, smallint, text, text, text[]) from public, anon;
grant execute on function public.submit_product_review_with_images(uuid, smallint, text, text, text[]) to authenticated;

create or replace function public.admin_create_product_review_with_images(
  p_product_id uuid,
  p_author_name text,
  p_rating smallint,
  p_title text,
  p_body text,
  p_image_paths text[] default '{}'::text[],
  p_status text default 'approved'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid := auth.uid();
  v_review_id uuid;
  v_path text;
  v_image_paths text[] := coalesce(p_image_paths, '{}'::text[]);
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
  if nullif(trim(coalesce(p_title, '')), '') is not null
     and char_length(trim(p_title)) not between 2 and 120 then
    raise exception 'invalid_review_title';
  end if;
  if cardinality(v_image_paths) > 3 then
    raise exception 'too_many_review_images';
  end if;
  if not exists (select 1 from public.products where id = p_product_id) then
    raise exception 'product_not_found';
  end if;

  foreach v_path in array v_image_paths loop
    if v_path !~ ('^admins/' || v_admin_id::text || '/[0-9a-f-]{36}\.webp$')
       or not exists (
         select 1
         from storage.objects
         where bucket_id = 'review-images' and name = v_path
       ) then
      raise exception 'invalid_review_image';
    end if;
  end loop;

  insert into public.product_reviews (
    product_id,
    author_name,
    rating,
    title,
    body,
    status,
    is_admin_created,
    image_paths
  ) values (
    p_product_id,
    trim(p_author_name),
    p_rating,
    nullif(trim(coalesce(p_title, '')), ''),
    trim(p_body),
    p_status,
    true,
    v_image_paths
  )
  returning id into v_review_id;

  return v_review_id;
end;
$$;

revoke all on function public.admin_create_product_review_with_images(uuid, text, smallint, text, text, text[], text) from public, anon;
grant execute on function public.admin_create_product_review_with_images(uuid, text, smallint, text, text, text[], text) to authenticated;

commit;
