import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  escapeInstallmentContractValue,
  installmentContractAcceptanceIsValid,
  renderInstallmentContract,
} from "./contract-render.ts";
import {
  contractOfferCanBeUsed,
  createInstallmentContractOfferToken,
  hashInstallmentContractContent,
  sanitizeInstallmentContractContent,
  validateInstallmentContractTemplate,
  verifyInstallmentContractOfferToken,
  findUnknownInstallmentContractPlaceholders,
} from "./contract-security.ts";

const productId = "5657128c-a3fb-4426-9ddb-9372c5fab2e8";
const variantId = "93c36ea6-d791-4150-a95d-518534f87990";
const secret = "contract-test-secret-value";
const presentedAt = "2026-08-20T12:00:00.000Z";
const now = Date.parse(presentedAt);

test("sözleşme HTML güvenliği script, iframe ve event handler alanlarını kaldırır", () => {
  const sanitized = sanitizeInstallmentContractContent(
    '<h2 onclick="alert(1)">Başlık</h2><script>alert(1)</script><iframe src="https://evil.test"></iframe><p>Güvenli metin</p>',
  );
  assert.equal(sanitized.includes("script"), false);
  assert.equal(sanitized.includes("iframe"), false);
  assert.equal(sanitized.includes("onclick"), false);
  assert.match(sanitized, /Güvenli metin/);
});

test("yalnız izin verilen dinamik sözleşme alanlarını kabul eder", () => {
  assert.deepEqual(
    findUnknownInstallmentContractPlaceholders(
      "{{customer_name}} {{product_name}} {{arbitrary_code}}",
    ),
    ["arbitrary_code"],
  );
  const result = validateInstallmentContractTemplate({
    title: "Elden Taksitli Satış Sözleşmesi",
    version: "v2-2026-09-01",
    contentHtml: `<p>${"Geçerli sözleşme metni ".repeat(6)}{{arbitrary_code}}</p>`,
  });
  assert.equal(result.data, null);
});

test("ürün, varyant, fiyat, tarih ve müşteri snapshot değerlerini doğru doldurur", () => {
  const rendered = renderInstallmentContract(
    "<p>{{customer_name}} · {{product_name}} · {{variant_name}} · {{product_price}} · {{application_date}}</p>",
    {
      customer_name: "CENTER GSM TEST",
      product_name: "Sony DualSense",
      variant_name: "Açık Mavi",
      product_price: "₺3.958",
      application_date: "20 Ağustos 2026",
    },
  );
  assert.match(rendered, /CENTER GSM TEST/);
  assert.match(rendered, /Sony DualSense/);
  assert.match(rendered, /Açık Mavi/);
  assert.match(rendered, /₺3\.958/);
  assert.match(rendered, /20 Ağustos 2026/);
});

test("dinamik değerleri HTML olarak çalıştırmaz", () => {
  assert.equal(
    escapeInstallmentContractValue('<img src=x onerror="alert(1)">'),
    "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;",
  );
});

test("contract checkbox kabulü yalnız gerçek boolean true olduğunda geçerlidir", () => {
  assert.equal(installmentContractAcceptanceIsValid(true), true);
  assert.equal(installmentContractAcceptanceIsValid(false), false);
  assert.equal(installmentContractAcceptanceIsValid("true"), false);
  assert.equal(installmentContractAcceptanceIsValid(1), false);
});

test("contract content hash SHA-256 ile birebir eşleşir", () => {
  const content = "<p>Immutable sözleşme snapshot içeriği</p>";
  assert.equal(
    hashInstallmentContractContent(content),
    createHash("sha256").update(content, "utf8").digest("hex"),
  );
});

test("offer token product, variant, hash, süre ve imzayı bağlar", () => {
  const contentHash = hashInstallmentContractContent("contract-v1");
  const token = createInstallmentContractOfferToken(
    {
      templateId: "5abdc119-6691-47c6-9a8c-0ed44f603e4e",
      productId,
      variantId,
      contentHash,
      presentedAt,
    },
    secret,
    now,
  );
  assert.ok(
    verifyInstallmentContractOfferToken(
      token,
      { productId, variantId },
      secret,
      now + 1000,
    ),
  );
  assert.equal(
    verifyInstallmentContractOfferToken(
      token,
      { productId, variantId: null },
      secret,
      now + 1000,
    ),
    null,
  );
  assert.equal(
    verifyInstallmentContractOfferToken(
      `${token.slice(0, -1)}x`,
      { productId, variantId },
      secret,
      now + 1000,
    ),
    null,
  );
  assert.equal(
    verifyInstallmentContractOfferToken(
      token,
      { productId, variantId },
      secret,
      now + 3 * 60 * 60 * 1000,
    ),
    null,
  );
});

test("v1 gösterilirken v2 aktifleşirse v1 geçerli, aktif sürüm kalmazsa geçersizdir", () => {
  assert.equal(contractOfferCanBeUsed(true, true), true);
  assert.equal(contractOfferCanBeUsed(false, true), true);
  assert.equal(contractOfferCanBeUsed(false, false), false);
});
