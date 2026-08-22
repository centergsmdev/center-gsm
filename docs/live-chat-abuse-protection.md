# Canlı destek abuse protection — veri ve gizlilik notu

Bu katman yalnız canlı destek kötüye kullanımını önlemek ve yönetici tarafından verilen erişim kararlarını uygulamak için kullanılır. Müşteri adı kimlik veya engel eşleştirme kaynağı değildir; yalnız yönetici incelemesinde gösterilir.

Tutulan sinyaller:

- Mevcut rastgele visitor UUID'si: sohbet sahipliği ve ziyaretçi eşleştirmesi.
- Giriş yapılmışsa Supabase `user_id`: aynı hesabın farklı cihazlardaki canlı destek engeli.
- Rastgele first-party abuse token'ın HMAC özeti: localStorage/cookie silinmediği sürece gizlilik dostu korelasyon.
- Güvenilir Vercel proxy başlığından alınan IP'nin HMAC özeti ve maskeli etiketi: yalnız ağ korelasyonu ve varsayılan olarak yalnız canlı destek engeli.
- Tarayıcı ailesi, işletim sistemi ailesi, kaba ekran sınıfı, saat dilimi ve dilin HMAC özeti: yalnız “muhtemelen ilişkili” değerlendirmesi; tek başına engel oluşturmaz.

Canvas, audio, WebGL, font, donanım seri numarası, IMEI/MAC veya storage silindikten sonra kimliği yeniden oluşturan supercookie teknikleri kullanılmaz. Ham IP ve ham abuse token veritabanına yazılmaz, loglanmaz veya audit metadata'sına eklenmez.

Erişim ve saklama:

- Kimlik gözlemleri RLS ile yalnız yetkili adminlerce okunabilir ve sohbet silinirse silinir.
- Rate-limit anahtarları yalnız HMAC özetidir, service-role dışında erişilemez ve 30 günlük lazy retention ile temizlenir.
- Engel kayıtları denetim için kaldırıldıktan sonra silinmez; `revoked_at`/`revoked_by` ile pasif olur.
- Süreli engeller bitiş zamanından sonra otomatik olarak eşleşmez.
- Site geneli engel yalnız hesap veya visitor + first-party token birlikteliği gibi güçlü sinyalle oluşturulur ve uygulanır. IP tek başına ürün, sepet, checkout, ödeme veya elden taksit başvurusunu engellemez.

First-party token veya tarayıcı storage'ı kullanıcı tarafından silinirse gizlice yeniden oluşturulmaz; sistem visitor, hesap, ağ ve rate-limit katmanlarından kalanlarla devam eder.
