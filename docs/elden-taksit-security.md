# Elden Taksit Başvuruları — Güvenlik ve Saklama Notları

Bu özellik normal sepet, checkout, ödeme, sipariş ve stok akışından bağımsızdır. Başvuru gönderilmesi veya admin tarafından onaylanması otomatik sipariş oluşturmaz, stok düşmez ve ödeme başlatmaz.

## Belge güvenliği

- Kimlik, ikametgâh ve imza dosyaları `installment-private` isimli private Supabase Storage bucket'ında tutulur.
- Client storage path seçemez ve API yanıtlarında raw storage path bulunmaz.
- Yükleme yalnız server route'u üzerinden yapılır. Gerçek dosya imzası doğrulanır; görseller Sharp ile decode edilip metadata temizlenerek WebP'ye yeniden kodlanır.
- SVG, HEIC/HEIF, executable içerik, MIME spoof ve aktif içerik barındıran PDF reddedilir.
- Dosya başına sınır 4 MB; görseller için üst boyut 12.000 px ve 40 megapikseldir.
- Admin belge erişimi session içindeki `app_metadata.role = admin` kontrolünden sonra server üzerinden verilir. Görüntüleme ve indirme ayrı audit olayı oluşturur.
- Service role anahtarı browser'a gönderilmez.

Bu uygulama katmanında ayrıca müşteri tarafından yönetilen bir şifreleme anahtarı kullanılmaz. Production projesinin at-rest encryption kapsamı Supabase sözleşme ve güvenlik belgeleri üzerinden ayrıca doğrulanmalıdır. İleride uygulama-seviyesi envelope encryption eklenirse anahtar repository veya public environment değişkenlerinde tutulmamalıdır.

## Saklama süresi

Her başvuru için `retention_review_at`, oluşturma tarihinden 180 gün sonrası olarak kaydedilir. Bu alan otomatik silme işlemi başlatmaz; yalnız periyodik hukuki/operasyonel inceleme için temel oluşturur. Production'da otomatik destructive deletion etkin değildir. Gerçek silme süresi ve yasal dayanak, veri sorumlusu tarafından hukuk danışmanıyla belirlenmelidir.

## Yetkilendirme ve kötüye kullanım önleme

- Başvuru tabloları RLS ile kapalıdır ve `anon`/`authenticated` rollere doğrudan tablo yetkisi verilmez.
- Müşteri taslağı HttpOnly, SameSite=Strict cookie ile random taslak tokenına bağlanır.
- Başvuru oluşturma, upload ve submit işlemleri IP'nin HMAC özeti üzerinden veritabanı tabanlı rate limit uygular; raw IP başvuru tablosunda saklanmaz.
- Submit işlemi server idempotency anahtarı ve atomik durum geçişi kullanır.
- Admin kararlarında revision tabanlı optimistic locking ve açık durum geçişleri uygulanır.
- Global audit kaydında kimlik belgesi, imza, storage path veya başvuru sahibinin tam kişisel verisi metadata olarak tutulmaz.
