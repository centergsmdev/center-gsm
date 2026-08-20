import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";

import {
  INSTALLMENT_FILE_MAX_SIZE,
  InstallmentFileError,
  validateInstallmentFile,
} from "./file-validation.ts";

async function imageFile(name = "belge.png", type = "image/png") {
  const buffer = await sharp({
    create: { width: 320, height: 200, channels: 3, background: "white" },
  })
    .png()
    .toBuffer();
  return new File([buffer], name, { type });
}

test("ikametgâh için gerçek PDF ve görsel kabul edilir", async () => {
  const pdf = new File(
    [Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n")],
    "ikametgah.pdf",
    { type: "application/pdf" },
  );
  const pdfResult = await validateInstallmentFile(pdf, "residence");
  assert.equal(pdfResult.storedMimeType, "application/pdf");
  const imageResult = await validateInstallmentFile(
    await imageFile(),
    "residence",
  );
  assert.equal(imageResult.storedMimeType, "image/webp");
});

test("executable ve MIME spoof dosyaları reddedilir", async () => {
  const executable = new File([Buffer.from("MZ\x90\x00fake")], "kimlik.jpg", {
    type: "image/jpeg",
  });
  await assert.rejects(
    validateInstallmentFile(executable, "identity_front"),
    InstallmentFileError,
  );
  const pngClaimedAsJpeg = await imageFile("kimlik.jpg", "image/jpeg");
  await assert.rejects(
    validateInstallmentFile(pngClaimedAsJpeg, "identity_front"),
    /Dosya türü ile görsel içeriği eşleşmiyor/,
  );
});

test("boyut sınırını aşan dosya reddedilir", async () => {
  const oversized = new File(
    [Buffer.alloc(INSTALLMENT_FILE_MAX_SIZE + 1)],
    "buyuk.png",
    { type: "image/png" },
  );
  await assert.rejects(
    validateInstallmentFile(oversized, "identity_back"),
    /en fazla 4 MB/,
  );
});

test("boş veya çok küçük imza reddedilir", async () => {
  const empty = await imageFile("imza.png", "image/png");
  await assert.rejects(
    validateInstallmentFile(empty, "signature"),
    /boş veya çizim doğrulama için çok küçük/,
  );
});

test("belirgin imza görseli güvenli WebP'ye dönüştürülür", async () => {
  const signature = await sharp({
    create: {
      width: 420,
      height: 180,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    },
  })
    .composite([
      {
        input: Buffer.from(
          '<svg width="420" height="180"><path d="M40 120 C90 20,150 170,210 80 S330 150,380 45" fill="none" stroke="black" stroke-width="8" stroke-linecap="round"/></svg>',
        ),
      },
    ])
    .png()
    .toBuffer();
  const result = await validateInstallmentFile(
    new File([signature], "imza.png", { type: "image/png" }),
    "signature",
  );
  assert.equal(result.storedMimeType, "image/webp");
  assert.ok(result.sizeBytes > 0);
});
