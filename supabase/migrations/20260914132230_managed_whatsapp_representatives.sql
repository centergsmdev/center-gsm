begin;

create table public.whatsapp_representatives (
  id uuid primary key default gen_random_uuid(),
  full_name text not null
    check (char_length(trim(full_name)) between 2 and 100),
  title text not null default 'Müşteri Temsilcisi'
    check (char_length(trim(title)) between 2 and 80),
  phone_e164 text not null
    check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  photo_url text
    check (photo_url is null or char_length(photo_url) <= 2048),
  photo_path text
    check (photo_path is null or char_length(photo_path) <= 512),
  sort_order integer not null default 0
    check (sort_order between 0 and 10000),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references auth.users(id) on delete set null
);

create index whatsapp_representatives_public_order_idx
  on public.whatsapp_representatives(sort_order, created_at, id)
  where is_active = true;

create index whatsapp_representatives_admin_order_idx
  on public.whatsapp_representatives(sort_order, created_at, id);

create index whatsapp_representatives_updated_by_idx
  on public.whatsapp_representatives(updated_by)
  where updated_by is not null;

create trigger set_whatsapp_representatives_updated_at
before update on public.whatsapp_representatives
for each row execute function public.set_updated_at();

alter table public.whatsapp_representatives enable row level security;

create policy whatsapp_representatives_anon_read_active
on public.whatsapp_representatives for select
to anon
using (is_active = true);

create policy whatsapp_representatives_authenticated_read
on public.whatsapp_representatives for select
to authenticated
using (is_active = true or (select public.current_user_is_admin()));

create policy whatsapp_representatives_admin_insert
on public.whatsapp_representatives for insert
to authenticated
with check ((select public.current_user_is_admin()));

create policy whatsapp_representatives_admin_update
on public.whatsapp_representatives for update
to authenticated
using ((select public.current_user_is_admin()))
with check ((select public.current_user_is_admin()));

create policy whatsapp_representatives_admin_delete
on public.whatsapp_representatives for delete
to authenticated
using ((select public.current_user_is_admin()));

revoke all on public.whatsapp_representatives from anon, authenticated;
grant select on public.whatsapp_representatives to anon, authenticated;
grant insert, update, delete on public.whatsapp_representatives to authenticated;
grant select, insert, update, delete on public.whatsapp_representatives to service_role;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'whatsapp-representatives',
  'whatsapp-representatives',
  true,
  4194304,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy whatsapp_representative_images_admin_insert
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'whatsapp-representatives'
  and (select public.current_user_is_admin())
);

create policy whatsapp_representative_images_admin_delete
on storage.objects for delete
to authenticated
using (
  bucket_id = 'whatsapp-representatives'
  and (select public.current_user_is_admin())
);

commit;
