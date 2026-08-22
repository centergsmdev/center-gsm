import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  CUSTOMER_SATISFACTION_MAX_PAGE,
  CUSTOMER_SATISFACTION_PAGE_SIZE,
  customerSatisfactionPageCount,
  parseCustomerSatisfactionQuery,
  privacySafeReviewName,
  ratingPercentage,
  withCustomerSatisfactionQuery,
} from "./customer-satisfaction-core.ts";

const migration = await readFile(
  new URL(
    "../../../supabase/migrations/20260822125223_customer_satisfaction_reviews.sql",
    import.meta.url,
  ),
  "utf8",
);
const page = await readFile(
  new URL("../../app/musteri-memnuniyeti/page.tsx", import.meta.url),
  "utf8",
);
const dataSource = await readFile(
  new URL("./customer-satisfaction.ts", import.meta.url),
  "utf8",
);
const gallery = await readFile(
  new URL("../../components/reviews/review-image-gallery.tsx", import.meta.url),
  "utf8",
);

test("public görünüm yalnız approved yorumları kapsar ve hassas alanları seçmez", () => {
  assert.match(
    migration,
    /create or replace view public\.customer_satisfaction_reviews[\s\S]*where review\.status = 'approved'/,
  );
  assert.doesNotMatch(
    migration.match(
      /create or replace view public\.customer_satisfaction_reviews[\s\S]*?from public\.product_reviews/,
    )?.[0] ?? "",
    /review\.(?:user_id|replied_by|status)\s*,/,
  );
  assert.match(
    migration,
    /revoke all on public\.customer_satisfaction_reviews from public, anon, authenticated/,
  );
  assert.match(
    migration,
    /grant select on public\.customer_satisfaction_reviews to service_role/,
  );
});

test("gerçek ortalama, toplam ve 1–5 yıldız dağılımı veritabanında hesaplanır", () => {
  assert.match(migration, /count\(\*\)::integer as total_count/);
  assert.match(migration, /round\(avg\(review\.rating\)::numeric, 2\)/);
  for (const rating of [1, 2, 3, 4, 5])
    assert.match(
      migration,
      new RegExp(`rating = ${rating}\\)::integer as rating_${rating}_count`),
    );
  assert.equal(ratingPercentage(82, 100), 82);
  assert.equal(ratingPercentage(1, 0), 0);
});

test("fotoğraf sayısı mevcut image_paths üzerinden hesaplanır", () => {
  assert.match(migration, /cardinality\(review\.image_paths\) > 0/);
  assert.match(dataSource, /not\("image_paths", "eq", "\{\}"\)/);
  assert.match(page, /ReviewImageGallery paths=\{review\.image_paths\}/);
});

test("doğrulanmış alışveriş yalnız kullanıcı, ürün ve teslim eşleşmesinde true olur", () => {
  assert.match(migration, /review\.user_id is not null/);
  assert.match(migration, /customer_order\.user_id = review\.user_id/);
  assert.match(migration, /order_item\.product_id = review\.product_id/);
  assert.match(
    migration,
    /customer_order\.(?:status|fulfillment_status) = 'delivered'/,
  );
  assert.match(page, /verified_count > 0/);
  assert.match(page, /review\.verified_purchase/);
});

test("mağaza yanıtı ve yalnız approved yorum için öne çıkarma desteklenir", () => {
  assert.match(page, /CENTER GSM Yanıtı/);
  assert.match(migration, /when 'feature'/);
  assert.match(migration, /where id = p_review_id and status = 'approved'/);
  assert.match(migration, /when 'unfeature'/);
  assert.match(page, /Öne Çıkan Müşteri Deneyimleri/);
});

test("filtre, sıralama ve ürün araması server sorgusuna uygulanır", () => {
  const parsed = parseCustomerSatisfactionQuery({
    rating: "5",
    filter: "photos",
    sort: "highest",
    search: " iPhone 17 ",
  });
  assert.deepEqual(parsed, {
    page: 1,
    rating: 5,
    filter: "photos",
    sort: "highest",
    search: "iPhone 17",
  });
  assert.match(dataSource, /\.eq\("rating", query\.rating\)/);
  assert.match(dataSource, /\.ilike\("product_name"/);
  assert.match(dataSource, /query\.sort === "highest"/);
  assert.match(dataSource, /query\.sort === "lowest"/);
});

test("pagination 12 kayıt ve en fazla 100 sayfa ile sınırlıdır", () => {
  assert.equal(CUSTOMER_SATISFACTION_PAGE_SIZE, 12);
  assert.equal(CUSTOMER_SATISFACTION_MAX_PAGE, 100);
  assert.equal(parseCustomerSatisfactionQuery({ page: "999" }).page, 100);
  assert.equal(parseCustomerSatisfactionQuery({ page: "-4" }).page, 1);
  assert.equal(customerSatisfactionPageCount(25), 3);
  assert.match(dataSource, /\.range\(/);
});

test("privacy-safe ad e-posta ve telefonu asla public ada dönüştürmez", () => {
  assert.equal(privacySafeReviewName("Ahmet Kaya"), "Ahmet K.");
  assert.equal(privacySafeReviewName("Ayşe Y."), "Ayşe Y.");
  assert.equal(
    privacySafeReviewName("musteri@example.com"),
    "CENTER GSM Müşterisi",
  );
  assert.equal(
    privacySafeReviewName("+90 555 111 22 33"),
    "CENTER GSM Müşterisi",
  );
  assert.doesNotMatch(
    page,
    /\b(?:user_id|phone|email|order_number|address)\b/i,
  );
});

test("boş durum sahte içerik üretmez ve tek mobil öncelikli DOM kullanır", () => {
  assert.match(page, /Henüz yayınlanmış müşteri değerlendirmesi bulunmuyor\./);
  assert.match(page, /grid gap-4 lg:grid-cols-2/);
  assert.doesNotMatch(page, /327|4\.8|Binlerce|%100 müşteri/);
});

test("lightbox Escape, focus trap ve focus restore sağlar", () => {
  assert.match(gallery, /event\.key === "Escape"/);
  assert.match(gallery, /event\.key !== "Tab"/);
  assert.match(gallery, /triggerRefs\.current\[previousIndex\]\?\.focus/);
  assert.match(gallery, /aria-modal="true"/);
});

test("sayfa yanlış review structured data üretmez ve canonical rotayı kullanır", () => {
  assert.match(page, /canonical: "\/musteri-memnuniyeti"/);
  assert.doesNotMatch(page, /aggregateRating|JsonLd|"@type": "Review"/);
  assert.match(page, /Müşteri Memnuniyeti ve Yorumlar \| CENTER GSM/);
});

test("query linkleri aktif filtreleri korur", () => {
  const href = withCustomerSatisfactionQuery(
    {
      page: 2,
      rating: 5,
      filter: "all",
      sort: "highest",
      search: "iPhone 17",
    },
    { page: 3 },
  );
  assert.match(href, /page=3/);
  assert.match(href, /rating=5/);
  assert.match(href, /sort=highest/);
  assert.match(href, /search=iPhone\+17/);
});
