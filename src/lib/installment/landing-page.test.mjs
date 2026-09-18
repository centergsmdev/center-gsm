import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (relativePath) =>
  readFileSync(new URL(relativePath, import.meta.url), "utf8");

const page = read("../../app/elden-taksit/page.tsx");
const landing = read("../../components/installment/installment-landing.tsx");
const metaBrowser = read("../meta/browser.ts");
const adminSettings = read("../../components/admin/admin-settings-form.tsx");
const desktopNavigation = read(
  "../../components/layout/desktop-category-navigation.tsx",
);
const mobileNavigation = read("../../components/layout/mobile-navigation.tsx");
const footerNavigation = read("../footer/navigation.ts");
const migration = read(
  "../../../supabase/migrations/20260918171309_add_installment_landing_video_url.sql",
);

test("elden taksit bilgilendirme sayfası mevcut site kabuğunu ve SEO bilgisini kullanır", () => {
  assert.match(page, /<Header \/>/);
  assert.match(page, /<Footer \/>/);
  assert.match(page, /Elden Taksit \| CENTER GSM/);
  assert.match(page, /canonical: "\/elden-taksit"/);
  assert.match(page, /getSiteSettings\(\)/);
});

test("ödeme koşulları sabit metinden değil aktif ödeme planından hesaplanır", () => {
  assert.match(page, /getActivePaymentPlanConfig/);
  assert.match(page, /calculatePaymentPlan/);
  assert.match(page, /formatBasisPoints/);
  assert.match(landing, /paymentInfo\.aboveThresholdRate/);
  assert.match(landing, /paymentInfo\.belowThresholdRate/);
  assert.match(landing, /paymentInfo\.installmentCounts/);
  assert.doesNotMatch(landing, /%15 ilk ödeme/);
  assert.doesNotMatch(landing, /4\.462,50 TL/);
});

test("sayfa müşteriyi gerçek ürün ve güvenli başvuru akışına yönlendirir", () => {
  for (const text of [
    "Ürünü seçin",
    "Ödeme planını inceleyin",
    "Başvuruyu başlatın",
    "Formu tamamlayın",
    "Değerlendirmeyi bekleyin",
    "Onay sonrası ödeme",
  ])
    assert.match(landing, new RegExp(text));

  assert.match(landing, /href="\/urunler"/);
  assert.match(landing, /Elden Taksit Başvurusu/);
  assert.match(landing, /kesin onay/);
  assert.doesNotMatch(page + landing, /buildWhatsAppHref/);
  assert.doesNotMatch(landing, /wa\.me/);
});

test("elden taksit sayfasına masaüstü, mobil ve alt menüden ulaşılır", () => {
  for (const navigation of [
    desktopNavigation,
    mobileNavigation,
    footerNavigation,
  ]) {
    assert.match(navigation, /href:?[= ]+"\/elden-taksit"/);
    assert.match(navigation, /Elden Taksit/);
  }
});

test("hassas belgeler tanıtım sayfasında veya WhatsApp'ta toplanmaz", () => {
  assert.doesNotMatch(landing, /type="file"/);
  assert.match(landing, /Kimlik ön yüzü/);
  assert.match(landing, /Kimlik arka yüzü/);
  assert.match(landing, /Güncel ikametgâh/);
  assert.match(landing, /Dijital imza/);
  assert.match(landing, /WhatsApp'ta toplanmaz/);
  assert.match(landing, /güvenli başvuru ekranına yüklenir/);
});

test("video URL'si yönetim panelinden değiştirilebilir ve boşken yer tutucu gösterilir", () => {
  assert.match(
    migration,
    /add column if not exists installment_landing_video_url text/,
  );
  assert.match(adminSettings, /installment_landing_video_url/);
  assert.match(adminSettings, /Tanıtım videosu URL'si/);
  assert.match(landing, /Bilgilendirme videosu hazırlanıyor/);
});

test("hazırlık kontrolü tamamlanmadan ürün kataloğu bağlantısı açılmaz", () => {
  assert.match(landing, /readinessItems/);
  assert.match(landing, /type="checkbox"/);
  assert.match(landing, /disabled/);
  assert.match(landing, /confirmedItems\.length === readinessItems\.length/);
});

test("landing ölçüm olayları mevcut Meta Pixel yardımcı yapısını yeniden kullanır", () => {
  for (const eventName of [
    "elden_taksit_page_view",
    "elden_taksit_video_start",
    "elden_taksit_terms_confirmed",
    "elden_taksit_products_click",
  ])
    assert.match(landing + metaBrowser, new RegExp(eventName));

  assert.match(metaBrowser, /window\.fbq\?\.\("trackCustom"/);
  assert.doesNotMatch(landing, /fbq\('init'/);
});
