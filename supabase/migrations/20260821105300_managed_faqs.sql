begin;

create table public.faq_items (
  id uuid primary key default gen_random_uuid(),
  category text not null check (char_length(trim(category)) between 2 and 80),
  question text not null check (char_length(trim(question)) between 5 and 240),
  answer text not null check (char_length(trim(answer)) between 10 and 4000),
  sort_order integer not null default 0 check (sort_order between 0 and 10000),
  is_published boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references auth.users(id) on delete set null
);

create index faq_items_public_order_idx
  on public.faq_items(category, sort_order, id)
  where is_published = true;

create index faq_items_admin_order_idx
  on public.faq_items(sort_order, created_at);

create trigger set_faq_items_updated_at
before update on public.faq_items
for each row execute function public.set_updated_at();

alter table public.faq_items enable row level security;

create policy faq_items_anon_read_published
on public.faq_items for select
to anon
using (is_published = true);

create policy faq_items_authenticated_read
on public.faq_items for select
to authenticated
using (is_published = true or (select public.current_user_is_admin()));

create policy faq_items_admin_insert
on public.faq_items for insert
to authenticated
with check ((select public.current_user_is_admin()));

create policy faq_items_admin_update
on public.faq_items for update
to authenticated
using ((select public.current_user_is_admin()))
with check ((select public.current_user_is_admin()));

create policy faq_items_admin_delete
on public.faq_items for delete
to authenticated
using ((select public.current_user_is_admin()));

revoke all on public.faq_items from anon, authenticated;
grant select on public.faq_items to anon, authenticated;
grant insert, update, delete on public.faq_items to authenticated;
grant select, insert, update, delete on public.faq_items to service_role;

insert into public.faq_items (category, question, answer, sort_order, is_published)
values
  (
    'Mağaza ve güven',
    'Yeriniz nerede?',
    'Mağazamız Tahılpazarı, Kazım Özalp Caddesi No:84, 07040 Muratpaşa/Antalya adresinde, giriş kattadır. Ziyaret etmeden önce WhatsApp üzerinden çalışma saatlerimizi ve ürün durumunu teyit edebilirsiniz.',
    10,
    true
  ),
  (
    'Elden taksit',
    'Elden taksitle almak için gerekli evraklar ve süreç nasıl?',
    'Ürün sayfasından Elden Taksit seçeneğini ve vade süresini belirleyip başvuru formuna geçebilirsiniz. Başvuruda kimliğinizin ön ve arka yüzü ile e-Devlet üzerinden alınmış güncel ikametgâh belgesi istenir. Ödeme planını ve sözleşmeyi okuyup onayladıktan sonra başvurunuz CENTER GSM tarafından değerlendirilir. Başvuru göndermek otomatik onay, ödeme veya sipariş oluşturmaz; sonuç inceleme sonrasında size bildirilir.',
    20,
    true
  ),
  (
    'Elden taksit',
    'Peşinat ödemeden taksitli alışveriş yapabilir miyim?',
    'Peşinat tutarı seçtiğiniz ürün ve o anda geçerli ödeme planına göre otomatik hesaplanır. Peşinatsız bir seçenek sunuluyorsa başvuru ekranındaki ödeme planında açıkça gösterilir. Ekranda yer almayan bir peşinatsız ödeme seçeneği için önceden onay veya garanti verilemez.',
    30,
    true
  ),
  (
    'Ödeme',
    'Kredi kartı ile alışveriş nasıl oluyor?',
    'Ürünü sepete ekleyerek veya Hemen Satın Al seçeneğini kullanarak normal ödeme adımlarına geçebilirsiniz. Teslimat bilgilerinizi girdikten sonra kredi kartı ödemenizi güvenli ödeme ekranında tamamlarsınız. Kullanılabilir taksit seçenekleri kartınızın bankasına ve aktif ödeme sağlayıcısına göre ödeme ekranında gösterilir. Kredi kartı alışverişi, elden taksit başvurusundan ayrı bir süreçtir.',
    40,
    true
  ),
  (
    'Mağaza ve güven',
    'Size nasıl güvenebilirim?',
    'CENTER GSM fiziksel mağaza adresi, ulaşılabilir destek kanalları, güvenli bağlantı, açık ürün bilgileri ve kayıtlı sipariş süreçleriyle hizmet verir. Elden taksit başvurusunda ödeme planı ve sözleşme onayınızdan önce gösterilir. Sorularınızı WhatsApp veya canlı destek üzerinden iletebilir, mağazamızı ziyaret ederek yüz yüze bilgi alabilirsiniz.',
    50,
    true
  ),
  (
    'Ödeme',
    'Ödemeler nasıl oluyor?',
    'Kredi kartı siparişlerinde ödeme normal checkout ekranındaki güvenli ödeme adımında yapılır. Elden taksit başvurularında ise başvuru sırasında ödeme alınmaz; başvurunuz onaylandıktan sonra size bildirilen ödeme planı ve takvim esas alınır. Her ödeme yönteminin tutarı ve koşulları işlem tamamlanmadan önce ekranda gösterilir.',
    60,
    true
  ),
  (
    'Elden taksit',
    'Elden taksit başvurusu otomatik olarak onaylanır mı?',
    'Hayır. Başvuru; bilgilerin, belgelerin ve seçilen ödeme planının değerlendirilmesi için alınır. Formu göndermek stok düşürmez, ödeme başlatmaz ve sipariş oluşturmaz. İnceleme sonucunda başvurunuzun onay veya ret durumu tarafınıza bildirilir.',
    70,
    true
  ),
  (
    'Elden taksit',
    'Başvuru yaptığımda ürün benim için ayrılır mı?',
    'Hayır. Başvuru aşamasında ürün stoğu düşmez ve ürün otomatik olarak rezerve edilmez. Başvurunun onaylanması ve satış sürecinin tamamlanması sırasında güncel stok durumu yeniden kontrol edilir.',
    80,
    true
  );

commit;
