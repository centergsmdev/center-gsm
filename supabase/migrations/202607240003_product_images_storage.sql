begin;

alter table public.product_images
add column if not exists path text;

update public.product_images
set path = regexp_replace(url, '^.*/product-images/', '')
where path is null and url like '%/product-images/%';

create unique index if not exists product_images_path_unique_idx
on public.product_images(path)
where path is not null;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Public can view product images"
on storage.objects for select to anon, authenticated
using (bucket_id = 'product-images');

create policy "Admins can upload product images"
on storage.objects for insert to authenticated
with check (bucket_id = 'product-images' and (select public.is_admin()));

create policy "Admins can update product images"
on storage.objects for update to authenticated
using (bucket_id = 'product-images' and (select public.is_admin()))
with check (bucket_id = 'product-images' and (select public.is_admin()));

create policy "Admins can delete product images"
on storage.objects for delete to authenticated
using (bucket_id = 'product-images' and (select public.is_admin()));

commit;
