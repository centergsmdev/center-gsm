create table public.content_pages (
  slug text primary key check (slug in ('hakkimizda','magazalarimiz','kariyer','iletisim','iade-ve-degisim','garanti','teknik-servis','kvkk','gizlilik','mesafeli-satis','cerez-tercihleri')),
  eyebrow text not null default '',
  title text not null,
  description text not null default '',
  body_html text not null default '',
  is_published boolean not null default true,
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references auth.users(id) on delete set null
);

insert into public.content_pages (slug, eyebrow, title) values
  ('hakkimizda', 'CENTER GSM', 'Hakkımızda'),
  ('magazalarimiz', 'Bize ulaşın', 'Mağazalarımız'),
  ('kariyer', 'Birlikte büyüyelim', 'Kariyer'),
  ('iletisim', 'Yanınızdayız', 'İletişim'),
  ('iade-ve-degisim', 'Müşteri hizmetleri', 'İade ve Değişim'),
  ('garanti', 'Satış sonrası destek', 'Garanti'),
  ('teknik-servis', 'Uzman destek', 'Teknik Servis'),
  ('kvkk', 'Yasal', 'KVKK Aydınlatma Metni'),
  ('gizlilik', 'Yasal', 'Gizlilik Politikası'),
  ('mesafeli-satis', 'Yasal', 'Mesafeli Satış Bilgilendirmesi'),
  ('cerez-tercihleri', 'Yasal', 'Çerez Tercihleri');

alter table public.content_pages enable row level security;

create policy "Public can read published content pages"
on public.content_pages for select to anon, authenticated
using (is_published or (select public.current_user_is_admin()));

create policy "Admins can update content pages"
on public.content_pages for update to authenticated
using ((select public.current_user_is_admin()))
with check ((select public.current_user_is_admin()));

revoke all on table public.content_pages from anon, authenticated;
grant select on table public.content_pages to anon, authenticated;
grant update on table public.content_pages to authenticated;
notify pgrst, 'reload schema';
