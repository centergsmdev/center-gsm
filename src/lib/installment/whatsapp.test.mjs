import assert from "node:assert/strict";
import test from "node:test";

import {
  createInstallmentWhatsAppHandoff,
  normalizeWhatsAppTurkishPhone,
  renderInstallmentScheduleForWhatsApp,
  shouldShowWhatsAppApprovalAction,
} from "./whatsapp.ts";

function schedule(count, total = 8_925_001) {
  const regular = Math.floor(total / count);
  return Array.from({ length: count }, (_, index) => ({
    installment: index + 1,
    amountMinor: index === count - 1 ? total - regular * (count - 1) : regular,
  }));
}

function source(overrides = {}) {
  return {
    status: "approved",
    applicantName: "Alpay Avcı",
    phone: "+90 (534) 872 95 79",
    productName: "iPhone 17 Pro",
    variantTitle: "iPhone 17 Pro 256 GB Kozmik Turuncu",
    paymentPlan: {
      configId: "config-1",
      configRevision: 1,
      productPriceMinor: 10_000_000,
      thresholdMinor: 7_000_000,
      downPaymentRateBps: 1_500,
      downPaymentAmountMinor: 1_500_000,
      remainingPrincipalMinor: 8_500_000,
      financeChargeRateBps: 500,
      financeChargeAmountMinor: 425_000,
      financedTotalMinor: 8_925_001,
      installmentCount: 12,
      installmentSchedule: schedule(12),
      totalPayableMinor: 10_425_001,
    },
    ...overrides,
  };
}

test("WhatsApp işlemi yalnız approved başvuruda görünür", () => {
  assert.equal(shouldShowWhatsAppApprovalAction("approved"), true);
  for (const status of ["submitted", "under_review", "rejected", "cancelled"])
    assert.equal(shouldShowWhatsAppApprovalAction(status), false);
});

test("Türkiye cep telefonunu wa.me biçimine güvenli normalize eder", () => {
  assert.equal(normalizeWhatsAppTurkishPhone("0534 872 95 79"), "905348729579");
  assert.equal(
    normalizeWhatsAppTurkishPhone("+90 (534) 872 95 79"),
    "905348729579",
  );
  assert.equal(normalizeWhatsAppTurkishPhone("212 555 12 12"), null);
});

test("mesaj müşteri adı, varyant ve tüm finansal snapshot değerlerini kullanır", () => {
  const handoff = createInstallmentWhatsAppHandoff(source());
  assert.equal(handoff.state, "ready");
  assert.match(handoff.message, /^Merhaba Alpay,/);
  assert.match(handoff.message, /Ürün: iPhone 17 Pro 256 GB Kozmik Turuncu/);
  assert.match(handoff.message, /Ürün Fiyatı: ₺100\.000/);
  assert.match(handoff.message, /Peşinat \(%15\): ₺15\.000/);
  assert.match(handoff.message, /Kalan Ana Tutar: ₺85\.000/);
  assert.match(handoff.message, /Vade Farkı \(%5\): ₺4\.250/);
  assert.match(handoff.message, /Taksitlendirilen Tutar: ₺89\.250,01/);
  assert.match(handoff.message, /Vade: 12 Ay/);
  assert.match(handoff.message, /Toplam Ödeme: ₺104\.250,01/);
});

test("varyant snapshot yoksa ürün başlığı snapshot'ını kullanır", () => {
  const handoff = createInstallmentWhatsAppHandoff(
    source({ variantTitle: null, productName: "Snapshot Ürün Başlığı" }),
  );
  assert.equal(handoff.state, "ready");
  assert.match(handoff.message, /Ürün: Snapshot Ürün Başlığı/);
});

test("3, 6, 9 ve 12 aylık gerçek schedule satırlarını aynen render eder", () => {
  for (const count of [3, 6, 9, 12]) {
    const rows = schedule(count);
    const rendered = renderInstallmentScheduleForWhatsApp(rows);
    assert.equal(rendered.split("\n").length, count);
    assert.match(rendered, new RegExp(`${count}\\. Taksit:`));
  }
});

test("son taksit kuruş farkını snapshot'taki gerçek tutarla korur", () => {
  const rendered = renderInstallmentScheduleForWhatsApp([
    { installment: 1, amountMinor: 33 },
    { installment: 2, amountMinor: 33 },
    { installment: 3, amountMinor: 34 },
  ]);
  assert.match(rendered, /1\. Taksit: ₺0,33/);
  assert.match(rendered, /3\. Taksit: ₺0,34/);
});

test("legacy ve geçersiz telefon kontrollü olarak WhatsApp handoff'u engeller", () => {
  assert.deepEqual(
    createInstallmentWhatsAppHandoff(source({ paymentPlan: null })),
    { state: "missing_payment_plan" },
  );
  assert.deepEqual(
    createInstallmentWhatsAppHandoff(source({ phone: "geçersiz" })),
    { state: "invalid_phone" },
  );
});

test("approved olmayan başvuruda mesaj veya URL üretmez", () => {
  for (const status of ["submitted", "under_review", "rejected"]) {
    assert.deepEqual(createInstallmentWhatsAppHandoff(source({ status })), {
      state: "not_approved",
    });
  }
});

test("Türkçe, TL işareti, yüzde ve satır sonlarını wa.me URL içinde encode eder", () => {
  const handoff = createInstallmentWhatsAppHandoff(source());
  assert.equal(handoff.state, "ready");
  assert.match(handoff.url, /^https:\/\/wa\.me\/905348729579\?text=/);
  assert.match(handoff.url, /%C3%96deme/);
  assert.match(handoff.url, /%E2%82%BA/);
  assert.match(handoff.url, /%25/);
  assert.match(handoff.url, /%0A/);
  assert.equal(
    decodeURIComponent(handoff.url.split("?text=")[1]),
    handoff.message,
  );
});

test("mesaj hazırlama kaynak snapshot veya başvuru durumunu mutate etmez", () => {
  const input = {
    ...source(),
    order: { status: "none" },
    stock: { quantity: 7 },
    payment: { status: "none" },
  };
  const before = structuredClone(input);
  createInstallmentWhatsAppHandoff(input);
  assert.deepEqual(input, before);
});
