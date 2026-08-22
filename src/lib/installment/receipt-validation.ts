import { createHash } from "node:crypto";

import sharp from "sharp";

export const INSTALLMENT_RECEIPT_MAX_SIZE = 10 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 40_000_000;

export class InstallmentReceiptFileError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function detectType(buffer: Buffer) {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  )
    return "jpeg" as const;
  if (
    buffer.length >= 8 &&
    buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  )
    return "png" as const;
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  )
    return "webp" as const;
  if (buffer.length >= 5 && buffer.subarray(0, 5).toString("ascii") === "%PDF-")
    return "pdf" as const;
  return null;
}

function validatePdf(buffer: Buffer) {
  const content = buffer.toString("latin1");
  const eof = content.lastIndexOf("%%EOF");
  if (eof < 0 || !/^[\s\0]*$/.test(content.slice(eof + 5)))
    throw new InstallmentReceiptFileError(
      "PDF dosyasının yapısı geçerli değil.",
    );
  if (
    /\/(JavaScript|JS|Launch|OpenAction|EmbeddedFile|RichMedia|XFA|AcroForm)\b/i.test(
      content,
    )
  )
    throw new InstallmentReceiptFileError(
      "Aktif içerik veya ek dosya barındıran PDF'ler kabul edilmez.",
    );
}

export async function validateInstallmentReceipt(file: File) {
  if (file.size < 1)
    throw new InstallmentReceiptFileError("Seçilen dosya boş.");
  if (file.size > INSTALLMENT_RECEIPT_MAX_SIZE)
    throw new InstallmentReceiptFileError(
      "Dekont dosyası en fazla 10 MB olabilir.",
      413,
    );

  const original = Buffer.from(await file.arrayBuffer());
  const detected = detectType(original);
  if (!detected)
    throw new InstallmentReceiptFileError(
      "Dekontun gerçek dosya biçimi doğrulanamadı.",
    );

  if (detected === "pdf") {
    if (file.type !== "application/pdf")
      throw new InstallmentReceiptFileError(
        "Dosya türü ile içeriği eşleşmiyor.",
      );
    validatePdf(original);
    return {
      buffer: original,
      storedMimeType: "application/pdf" as const,
      extension: "pdf" as const,
      sizeBytes: original.length,
      sha256: createHash("sha256").update(original).digest("hex"),
    };
  }

  const expectedMime = {
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
  }[detected];
  if (file.type !== expectedMime)
    throw new InstallmentReceiptFileError(
      "Dosya türü ile görsel içeriği eşleşmiyor.",
    );

  try {
    const decoder = sharp(original, {
      failOn: "error",
      limitInputPixels: MAX_IMAGE_PIXELS,
    });
    const metadata = await decoder.metadata();
    if (
      metadata.format !== detected ||
      !metadata.width ||
      !metadata.height ||
      metadata.width * metadata.height > MAX_IMAGE_PIXELS
    )
      throw new InstallmentReceiptFileError(
        "Dekont görseli güvenli boyut sınırlarının dışında.",
      );
    const transformed = await decoder
      .rotate()
      .webp({ quality: 90 })
      .toBuffer({ resolveWithObject: true });
    if (transformed.data.length > INSTALLMENT_RECEIPT_MAX_SIZE)
      throw new InstallmentReceiptFileError(
        "İşlenen dekont 10 MB sınırını aşıyor.",
        413,
      );
    return {
      buffer: transformed.data,
      storedMimeType: "image/webp" as const,
      extension: "webp" as const,
      sizeBytes: transformed.data.length,
      sha256: createHash("sha256").update(transformed.data).digest("hex"),
    };
  } catch (caught) {
    if (caught instanceof InstallmentReceiptFileError) throw caught;
    throw new InstallmentReceiptFileError(
      "Dekont görseli güvenli biçimde çözümlenemedi.",
    );
  }
}
