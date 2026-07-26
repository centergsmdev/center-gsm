begin;

insert into public.categories (id, name, slug, description, sort_order) values
  ('00000000-0000-4000-8000-000000000001', 'Telefon', 'telefon', 'Akıllı telefonlar ve mobil teknoloji ürünleri.', 1),
  ('00000000-0000-4000-8000-000000000002', 'Bilgisayar', 'bilgisayar', 'Dizüstü ve profesyonel bilgisayarlar.', 2),
  ('00000000-0000-4000-8000-000000000003', 'Tablet', 'tablet', 'Mobil üretkenlik ve eğlence cihazları.', 3),
  ('00000000-0000-4000-8000-000000000004', 'Akıllı Saat', 'akilli-saat', 'Sağlık ve aktivite odaklı giyilebilir teknoloji.', 4),
  ('00000000-0000-4000-8000-000000000005', 'Kulaklık', 'kulaklik', 'Kablosuz ve yüksek çözünürlüklü ses ürünleri.', 5),
  ('00000000-0000-4000-8000-000000000006', 'Aksesuar', 'aksesuar', 'Teknoloji deneyimini tamamlayan aksesuarlar.', 6)
on conflict (id) do update set name = excluded.name, slug = excluded.slug, description = excluded.description, sort_order = excluded.sort_order, is_active = true;

insert into public.brands (id, name, slug, description) values
  ('10000000-0000-4000-8000-000000000001', 'Nova', 'nova', 'Premium mobil teknoloji ürünleri.'),
  ('10000000-0000-4000-8000-000000000002', 'Auralis', 'auralis', 'Yeni nesil kişisel ses teknolojileri.'),
  ('10000000-0000-4000-8000-000000000003', 'Core', 'core', 'Performans ve üretkenlik odaklı bilgisayarlar.'),
  ('10000000-0000-4000-8000-000000000004', 'Pulse', 'pulse', 'Akıllı sağlık ve giyilebilir teknoloji.'),
  ('10000000-0000-4000-8000-000000000005', 'Vision', 'vision', 'Yaratıcılık ve mobil üretkenlik cihazları.')
on conflict (id) do update set name = excluded.name, slug = excluded.slug, description = excluded.description, is_active = true;

insert into public.products (id, name, slug, sku, description, short_description, category_id, brand_id, price, old_price, stock_quantity, is_active, is_featured, warranty_months, rating, review_count) values
  ('20000000-0000-4000-8000-000000000001', 'Nova X Pro 256 GB', 'nova-x-pro-256', 'CG-NOVA-XP-256', '6.7 inç OLED ekran, gelişmiş kamera sistemi ve tüm gün pil ömrü.', 'Amiral gemisi mobil performans ve premium kamera deneyimi.', '00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 42999, 49999, 24, true, true, 24, 4.8, 128),
  ('20000000-0000-4000-8000-000000000002', 'Auralis AirSound Max', 'airsound-max', 'CG-AUR-AS-MAX', 'Aktif gürültü engelleme ve yüksek çözünürlüklü kablosuz ses.', 'Premium kablosuz ses ve aktif gürültü engelleme.', '00000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000002', 8749, 10499, 8, true, true, 24, 4.7, 84),
  ('20000000-0000-4000-8000-000000000003', 'Core Book Air 14', 'corebook-air-14', 'CG-CORE-AIR14', 'İnce alüminyum gövde, güçlü işlemci ve 18 saate varan pil ömrü.', 'Hafif gövdede uzun pil ömrü ve güçlü performans.', '00000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000003', 36499, 39999, 16, true, true, 24, 4.9, 216),
  ('20000000-0000-4000-8000-000000000004', 'Pulse Watch S', 'pulse-watch-s', 'CG-PULSE-WATCH-S', 'Sağlık takibi, parlak AMOLED ekran ve hafif premium tasarım.', 'Günlük sağlık takibi için zarif akıllı saat.', '00000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000004', 6299, 7999, 31, true, false, 24, 4.6, 67),
  ('20000000-0000-4000-8000-000000000005', 'Vision Tab 11 Pro', 'vision-tab-11', 'CG-VISION-TAB11', 'Yüksek çözünürlüklü ekran ve üretkenlik odaklı kalem deneyimi.', 'Kalem destekli premium üretkenlik tableti.', '00000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000005', 18999, 21999, 7, true, false, 24, 4.5, 49),
  ('20000000-0000-4000-8000-000000000006', 'Nova Lite 128 GB', 'nova-lite-128', 'CG-NOVA-LITE128', 'Canlı ekran, akıcı performans ve zarif günlük kullanım deneyimi.', 'Dengeli performansa sahip erişilebilir akıllı telefon.', '00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 17999, 19999, 42, true, false, 24, 4.4, 93),
  ('20000000-0000-4000-8000-000000000007', 'Auralis Studio Buds Pro', 'studio-buds-pro', 'CG-AUR-BUDS-PRO', 'Kompakt gövde, dengeli ses ve güçlü çevresel gürültü kontrolü.', 'Kompakt tasarımda güçlü gürültü kontrolü.', '00000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000002', 4499, 5299, 55, true, false, 24, 4.7, 174),
  ('20000000-0000-4000-8000-000000000008', 'Core Book Pro 16', 'corebook-pro-16', 'CG-CORE-PRO16', 'Profesyonel iş akışları için yüksek performans ve geniş ekran.', 'Profesyonel üretim için geniş ekranlı performans sistemi.', '00000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000003', 58999, null, 5, true, true, 24, 4.9, 38)
on conflict (id) do update set
  name = excluded.name, slug = excluded.slug, sku = excluded.sku, description = excluded.description,
  short_description = excluded.short_description, category_id = excluded.category_id, brand_id = excluded.brand_id,
  price = excluded.price, old_price = excluded.old_price, stock_quantity = excluded.stock_quantity,
  is_active = excluded.is_active, is_featured = excluded.is_featured, warranty_months = excluded.warranty_months,
  rating = excluded.rating, review_count = excluded.review_count;

commit;
