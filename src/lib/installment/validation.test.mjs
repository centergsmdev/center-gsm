import assert from "node:assert/strict";
import test from "node:test";

import { hashText, safeTokenMatch } from "./access-token.ts";
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
