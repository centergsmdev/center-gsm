# CENTER GSM

Next.js 15, TypeScript ve Tailwind CSS ile geliştirilen premium teknoloji mağazası frontend’i. Demo veri sistemi korunur; Supabase altyapısı ortam değişkenleri tanımlanmadığında güvenli biçimde devre dışı kalır.

## Yerel geliştirme

```bash
npm install
npm run dev
```

## Supabase kurulumu

1. Supabase üzerinde yeni bir proje oluşturun.
2. `.env.example` dosyasını `.env.local` olarak kopyalayın.
3. Supabase Project Settings → API bölümündeki Project URL ve anon/public key değerlerini ekleyin:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

4. `supabase/migrations/202607240001_initial_commerce_schema.sql` dosyasını Supabase SQL Editor üzerinden çalıştırın.
5. Ardından `supabase/seed/001_catalog_seed.sql` dosyasını çalıştırın.

Service role key frontend environment dosyalarına veya kaynak koda eklenmemelidir. Uygulama yalnızca public anon key kullanır; veri erişimi migration içindeki Row Level Security politikalarıyla sınırlandırılır.

## Bağlantı kontrolü

`checkSupabaseConnection` yardımcı fonksiyonu yapılandırılmış browser veya server client ile çağrılabilir. Fonksiyon `connected`, `not-configured` veya güvenli bir `error` sonucu döndürür; hassas hata ayrıntılarını kullanıcıya açmaz.

## Kontroller

```bash
npm run lint
npm run build
```

## Admin ürün CRUD kurulumu

1. İlk şemadan sonra `supabase/migrations/202607240002_admin_product_crud.sql` migration dosyasını çalıştırın.
2. Supabase Authentication bölümünde admin kullanıcısını oluşturun.
3. Kullanıcının `app_metadata` alanına güvenli bir yönetim rolü ekleyin. Örneğin SQL Editor içinde e-posta adresini kendi admin hesabınızla değiştirin:

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
where email = 'admin@example.com';
```

Admin paneli yalnızca geçerli Supabase oturumu ve `app_metadata.role = admin` bulunan kullanıcılar için ürün yazma işlemlerine izin verir. Anon key ile doğrudan ürün ekleme veya güncelleme yapılamaz.

### Ürün görselleri

`supabase/migrations/202607240003_product_images_storage.sql` migration dosyasını ürün CRUD migrationından sonra çalıştırın. Bu migration public `product-images` bucket'ını, 5 MB dosya limitini, JPEG/PNG/WebP kısıtını, `product_images.path` alanını ve admin Storage politikalarını oluşturur.

### Kategori ve marka yönetimi

`supabase/migrations/202607240004_admin_taxonomy_crud.sql` migration dosyasını Storage migrationından sonra çalıştırın. Migration kategori görsel alanını ve admin rolüne özel kategori/marka ekleme-güncelleme RLS politikalarını oluşturur. Kategori görselleri `categories/`, marka logoları `brands/` klasörleriyle mevcut `product-images` bucket'ında saklanır.

### Sipariş yönetimi

`supabase/migrations/202607240005_order_management.sql` migration dosyasını önceki migrationlardan sonra çalıştırın. Migration transaction tabanlı sipariş oluşturma ve güvenli sipariş sorgulama RPC'lerini, admin sipariş politikalarını, durum geçmişini ve admin not alanını oluşturur.

### Supabase Auth kurulumu

1. `supabase/migrations/202607240006_supabase_auth_accounts.sql` migration dosyasını çalıştırın. Yeni Auth kullanıcıları için `profiles` kaydı güvenli trigger ile otomatik oluşturulur.
2. Supabase Dashboard → Authentication → URL Configuration bölümünde Site URL değerini production adresinize ayarlayın.
3. Yerel ve production yönlendirmelerini Redirect URLs listesine ekleyin:
   - `http://localhost:3000/hesabim`
   - `http://localhost:3000/sifre-yenile`
   - `https://alan-adiniz.com/hesabim`
   - `https://alan-adiniz.com/sifre-yenile`
4. Şifre sıfırlama e-postaları `/sifre-yenile` adresine döner. E-posta şablonlarında `{{ .ConfirmationURL }}` bağlantısını koruyun.

Admin hesabını Authentication → Users bölümünden oluşturun. Rol yalnızca Dashboard veya güvenli SQL Editor işlemiyle `app_metadata` içine atanmalıdır:

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
where email = 'admin@example.com';
```

`role` değerini `user_metadata` içine koymak admin yetkisi vermez. Frontend service role key kullanmaz ve kullanıcılar `app_metadata` alanlarını browser üzerinden değiştiremez.
