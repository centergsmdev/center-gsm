import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateRateAmount,
  calculatePaymentPlan,
  createInstallmentSchedule,
  liraToMinor,
  paymentScheduleTotal,
} from "../payment-plan/engine.ts";
import {
  createPaymentPlanOfferToken,
  verifyPaymentPlanOfferToken,
} from "../payment-plan/security.ts";
import { renderInstallmentContract } from "./contract-render.ts";

const config = {
  id: "0c2c522a-a72a-44ad-8f67-f604eb3ba428",
  revision: 1,
  thresholdMinor: 7_000_000,
  aboveThresholdDownPaymentBps: 1_500,
  belowThresholdDownPaymentBps: 2_000,
  installmentFinanceChargeBps: 500,
  installmentCounts: [3, 6, 9, 12],
  creditCardFinanceChargeBps: 0,
  creditCardInstallmentCounts: [3, 6, 9, 12],
  createdAt: "2026-08-20T12:00:00.000Z",
};

function installment(price, count = 12) {
  return calculatePaymentPlan({
    paymentType: "installment_application",
    productPriceMinor: liraToMinor(price),
    installmentCount: count,
    config,
  });
}

test("69.999,99 TL yüzde 20 peşinat grubundadır", () => {
  const plan = installment("69999.99");
  assert.equal(plan.downPaymentRateBps, 2_000);
});

test("70.000,00 TL ve 70.000,01 TL yüzde 15 grubundadır", () => {
  assert.equal(installment("70000.00").downPaymentRateBps, 1_500);
  assert.equal(installment("70000.01").downPaymentRateBps, 1_500);
});

test("yüksek güvenli kuruş tutarlarında oran hesabı taşmadan kesin kalır", () => {
  assert.equal(calculateRateAmount(1_000_000_000_000, 1_500), 150_000_000_000);
});

test("100.000 TL örneği peşinat, kalan, vade farkı ve toplamı doğru hesaplar", () => {
  const plan = installment("100000", 12);
  assert.equal(plan.downPaymentAmountMinor, 1_500_000);
  assert.equal(plan.remainingPrincipalMinor, 8_500_000);
  assert.equal(plan.financeChargeAmountMinor, 425_000);
  assert.equal(plan.financedTotalMinor, 8_925_000);
  assert.equal(plan.monthlyInstallmentMinor, 743_750);
  assert.equal(plan.totalPayableMinor, 10_425_000);
});

test("60.000 TL örneği yüzde 20 peşinat ve kalan üzerinden yüzde 5 uygular", () => {
  const plan = installment("60000", 6);
  assert.equal(plan.downPaymentAmountMinor, 1_200_000);
  assert.equal(plan.remainingPrincipalMinor, 4_800_000);
  assert.equal(plan.financeChargeAmountMinor, 240_000);
  assert.equal(plan.financedTotalMinor, 5_040_000);
  assert.equal(plan.monthlyInstallmentMinor, 840_000);
  assert.equal(plan.totalPayableMinor, 6_240_000);
});

test("3, 6, 9 ve 12 aylık planların toplamı kuruşu kuruşuna eşittir", () => {
  for (const count of [3, 6, 9, 12]) {
    const plan = installment("100000", count);
    assert.equal(
      paymentScheduleTotal(plan.installmentSchedule),
      plan.financedTotalMinor,
    );
  }
});

test("bölünemeyen kuruş farkını son taksit kapatır", () => {
  const schedule = createInstallmentSchedule(100, 3);
  assert.deepEqual(schedule, [
    { installment: 1, amountMinor: 33 },
    { installment: 2, amountMinor: 33 },
    { installment: 3, amountMinor: 34 },
  ]);
  assert.equal(paymentScheduleTotal(schedule), 100);
});

test("kredi kartında peşinat ve vade farkı sıfır, toplam ürün fiyatıdır", () => {
  const plan = calculatePaymentPlan({
    paymentType: "credit_card",
    productPriceMinor: liraToMinor("60000"),
    installmentCount: 9,
    config,
  });
  assert.equal(plan.downPaymentAmountMinor, 0);
  assert.equal(plan.financeChargeAmountMinor, 0);
  assert.equal(plan.financedTotalMinor, 6_000_000);
  assert.equal(plan.totalPayableMinor, 6_000_000);
  assert.equal(paymentScheduleTotal(plan.installmentSchedule), 6_000_000);
});

test("varyant fiyatı değişince plan aynı config ile anında yeniden hesaplanır", () => {
  const base = installment("60000", 12);
  const variant = installment("100000", 12);
  assert.equal(base.downPaymentRateBps, 2_000);
  assert.equal(variant.downPaymentRateBps, 1_500);
  assert.notEqual(base.totalPayableMinor, variant.totalPayableMinor);
});

test("offer token ürün, varyant, config revision ve server fiyatını bağlar", () => {
  const now = Date.parse("2026-08-20T12:00:00.000Z");
  const productId = "5657128c-a3fb-4426-9ddb-9372c5fab2e8";
  const variantId = "93c36ea6-d791-4150-a95d-518534f87990";
  const token = createPaymentPlanOfferToken(
    {
      configId: config.id,
      configRevision: config.revision,
      productId,
      variantId,
      productPriceMinor: liraToMinor("69999.99"),
      presentedAt: "2026-08-20T12:00:00.000Z",
    },
    "payment-plan-test-secret",
    now,
  );
  const payload = verifyPaymentPlanOfferToken(
    token,
    { productId, variantId },
    "payment-plan-test-secret",
    now + 1_000,
  );
  assert.equal(payload?.configRevision, 1);
  assert.equal(payload?.productPriceMinor, 6_999_999);
  assert.equal(
    verifyPaymentPlanOfferToken(
      token,
      { productId, variantId: null },
      "payment-plan-test-secret",
      now + 1_000,
    ),
    null,
  );
  assert.equal(
    verifyPaymentPlanOfferToken(
      `${token.slice(0, -1)}x`,
      { productId, variantId },
      "payment-plan-test-secret",
      now + 1_000,
    ),
    null,
  );
});

test("sözleşme snapshot metni gerçek ödeme planı alanlarını içerir", () => {
  const rendered = renderInstallmentContract(
    "<p>{{product_price}} {{down_payment_rate}} {{down_payment_amount}} {{remaining_principal}} {{finance_charge_rate}} {{finance_charge_amount}} {{installment_count}} {{installment_schedule}} {{total_payable}}</p>",
    {
      customer_name: "CENTER GSM TEST",
      product_name: "Test Ürün",
      variant_name: "Test Varyant",
      product_price: "₺100.000",
      application_date: "20 Ağustos 2026",
      down_payment_rate: "%15",
      down_payment_amount: "₺15.000",
      remaining_principal: "₺85.000",
      finance_charge_rate: "%5",
      finance_charge_amount: "₺4.250",
      installment_count: "12 Ay",
      installment_schedule: "1. taksit: ₺7.437,50",
      total_payable: "₺104.250",
    },
  );
  assert.match(rendered, /%15/);
  assert.match(rendered, /₺4\.250/);
  assert.match(rendered, /12 Ay/);
  assert.match(rendered, /₺104\.250/);
});
