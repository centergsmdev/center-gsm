import assert from "node:assert/strict";
import test from "node:test";

import sharp from "sharp";

import {
  INSTALLMENT_RECEIPT_MAX_SIZE,
  InstallmentReceiptFileError,
  validateInstallmentReceipt,
} from "./receipt-validation.ts";

test("güvenli dekont görselini WebP olarak saklar", async () => {
  const buffer = await sharp({
    create: { width: 500, height: 700, channels: 3, background: "white" },
  })
    .png()
    .toBuffer();
  const result = await validateInstallmentReceipt(
    new File([buffer], "dekont.png", { type: "image/png" }),
  );
  assert.equal(result.storedMimeType, "image/webp");
  assert.ok(result.sha256.length === 64);
});

test("güvenli PDF dekontunu kabul eder", async () => {
  const file = new File(
    [Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n")],
    "dekont.pdf",
    { type: "application/pdf" },
  );
  const result = await validateInstallmentReceipt(file);
  assert.equal(result.storedMimeType, "application/pdf");
});

test("MIME taklidi ve büyük dosyayı reddeder", async () => {
  await assert.rejects(
    validateInstallmentReceipt(
      new File([Buffer.from("MZfake")], "dekont.jpg", {
        type: "image/jpeg",
      }),
    ),
    InstallmentReceiptFileError,
  );
  await assert.rejects(
    validateInstallmentReceipt(
      new File([Buffer.alloc(INSTALLMENT_RECEIPT_MAX_SIZE + 1)], "buyuk.pdf", {
        type: "application/pdf",
      }),
    ),
    /en fazla 10 MB/,
  );
});
