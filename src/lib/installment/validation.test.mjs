import assert from "node:assert/strict";
import test from "node:test";

import { hashText, safeTokenMatch } from "./access-token.ts";
import {
  formatInstallmentDownPaymentCommitment,
  isInstallmentDownPaymentTiming,
} from "./types.ts";
import {
  missingInstallmentDocuments,
  normalizeTurkishPhone,
  validateProductVariantSelection,
} from "./validation.ts";

test("Türkiye telefon numarasını E.164 biçimine normalize eder", () => {
  assert.equal(normalizeTurkishPhone("0534 872 95 79"), "+905348729579");
  assert.equal(normalizeTurkishPhone("+90 (534) 872 95 79"), "+905348729579");
  assert.equal(normalizeTurkishPhone("212 555 12 12"), null);
});

test("seçili varyant gerçekten ürüne ait ve aktif olmalıdır", () => {
  const product = { id: "product-a", is_active: true };
  const variants = [
    { id: "variant-a", product_id: "product-a", is_active: true },
    { id: "variant-inactive", product_id: "product-a", is_active: false },
    { id: "variant-other", product_id: "product-b", is_active: true },
  ];
  assert.equal(
    validateProductVariantSelection(product, variants, "variant-a"),
    null,
  );
  assert.equal(
    validateProductVariantSelection(product, variants, "variant-inactive"),
    "invalid_variant",
  );
  assert.equal(
    validateProductVariantSelection(product, variants, "variant-other"),
    "invalid_variant",
  );
});

test("varyantsız ürün kabul edilir, varyantlı üründe seçim zorunludur", () => {
  const product = { id: "product-a", is_active: true };
  assert.equal(validateProductVariantSelection(product, [], null), null);
  assert.equal(
    validateProductVariantSelection(
      product,
      [{ id: "variant-a", product_id: "product-a", is_active: true }],
      null,
    ),
    "variant_required",
  );
  assert.equal(
    validateProductVariantSelection({ ...product, is_active: false }, [], null),
    "inactive_product",
  );
});

test("kimlik ön, kimlik arka, ikametgâh ve imza ayrı ayrı zorunludur", () => {
  assert.deepEqual(missingInstallmentDocuments({}), [
    "identity_front",
    "identity_back",
    "residence",
    "signature",
  ]);
  assert.deepEqual(
    missingInstallmentDocuments({
      identity_front: true,
      identity_back: true,
      residence: true,
      signature: true,
    }),
    [],
  );
});

test("taslak tokenı başka başvuru tokenıyla eşleşmez", () => {
  const applicationAToken = "customer-a-random-token";
  const applicationBToken = "customer-b-random-token";
  assert.equal(
    safeTokenMatch(hashText(applicationAToken), applicationAToken),
    true,
  );
  assert.equal(
    safeTokenMatch(hashText(applicationAToken), applicationBToken),
    false,
  );
});

test("yalnız ödeme yapmaya hazır seçenekler başvuruya devam edebilir", () => {
  assert.equal(isInstallmentDownPaymentTiming("immediate"), true);
  assert.equal(isInstallmentDownPaymentTiming("today_12_15"), true);
  assert.equal(isInstallmentDownPaymentTiming("today_15_18"), true);
  assert.equal(isInstallmentDownPaymentTiming("not_ready"), false);
  assert.equal(isInstallmentDownPaymentTiming(""), false);
});

test("admin ödeme taahhüdünü seçilen gün ve saatle görür", () => {
  assert.equal(
    formatInstallmentDownPaymentCommitment(
      "today_12_15",
      "Bugün 12.00–15.00 arasında",
      "2026-08-23",
    ),
    "23.08.2026 · 12.00–15.00 arasında",
  );
  assert.equal(
    formatInstallmentDownPaymentCommitment(
      "immediate",
      "Hemen ödeyebilirim",
      "2026-08-23",
    ),
    "23.08.2026 · Hemen ödeyebilirim",
  );
  assert.match(
    formatInstallmentDownPaymentCommitment(null, null, null),
    /seçim kaydı yok/,
  );
});
