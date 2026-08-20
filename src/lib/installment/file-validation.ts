import { createHash } from "node:crypto";
import sharp from "sharp";

import type { InstallmentDocumentType } from "@/lib/installment/types";

export const INSTALLMENT_FILE_MAX_SIZE = 4 * 1024 * 1024;
export const INSTALLMENT_IMAGE_MAX_DIMENSION = 12_000;
export const INSTALLMENT_IMAGE_MAX_PIXELS = 40_000_000;

type DetectedFileType = "jpeg" | "png" | "webp" | "pdf" | "heic" | null;

export class InstallmentFileError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function detectFileType(buffer: Buffer): DetectedFileType {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  )
    return "jpeg";
  if (
    buffer.length >= 8 &&
    buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  )
    return "png";
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  )
    return "webp";
  if (buffer.length >= 5 && buffer.subarray(0, 5).toString("ascii") === "%PDF-")
    return "pdf";
  if (
    buffer.length >= 12 &&
    buffer.subarray(4, 8).toString("ascii") === "ftyp" &&
    /^(heic|heix|hevc|hevx|mif1|msf1)$/.test(
      buffer.subarray(8, 12).toString("ascii"),
    )
  )
    return "heic";
  return null;
}

function validatePdf(buffer: Buffer) {
  const content = buffer.toString("latin1");
  const eof = content.lastIndexOf("%%EOF");
  if (eof < 0 || !/^[\s\0]*$/.test(content.slice(eof + 5)))
    throw new InstallmentFileError("PDF dosyasının yapısı geçerli değil.");
  if (
    /\/(JavaScript|JS|Launch|OpenAction|EmbeddedFile|RichMedia|XFA|AcroForm)\b/i.test(
      content,
    )
  )
    throw new InstallmentFileError(
      "Aktif içerik veya ek dosya barındıran PDF'ler kabul edilmez.",
    );
}

async function validateSignatureInk(buffer: Buffer) {
  const { data, info } = await sharp(buffer, {
    failOn: "error",
    limitInputPixels: INSTALLMENT_IMAGE_MAX_PIXELS,
  })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let inkPixels = 0;
  let minX = info.width;
  let minY = info.height;
  let maxX = 0;
  let maxY = 0;
  for (let index = 0; index < data.length; index += 4) {
    const r = data[index];
    const g = data[index + 1];
    const b = data[index + 2];
    const alpha = data[index + 3];
    if (alpha < 20 || (r > 235 && g > 235 && b > 235)) continue;
    const pixel = index / 4;
    const x = pixel % info.width;
    const y = Math.floor(pixel / info.width);
    inkPixels += 1;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  if (inkPixels < 400 || maxX - minX < 60 || maxY - minY < 20)
    throw new InstallmentFileError(
      "İmza alanı boş veya çizim doğrulama için çok küçük.",
    );
}

export async function validateInstallmentFile(
  file: File,
  documentType: InstallmentDocumentType,
) {
  if (file.size < 1) throw new InstallmentFileError("Seçilen dosya boş.");
  if (file.size > INSTALLMENT_FILE_MAX_SIZE)
    throw new InstallmentFileError("Dosya boyutu en fazla 4 MB olabilir.", 413);

  const original = Buffer.from(await file.arrayBuffer());
  const detected = detectFileType(original);
  if (detected === "heic")
    throw new InstallmentFileError(
      "HEIC/HEIF bu aşamada desteklenmiyor. Lütfen JPG, PNG veya WebP olarak yükleyin.",
    );
  if (!detected)
    throw new InstallmentFileError("Dosyanın gerçek biçimi doğrulanamadı.");

  const imageType =
    detected === "jpeg" || detected === "png" || detected === "webp";
  if (documentType !== "residence" && !imageType)
    throw new InstallmentFileError(
      "Bu alan için yalnızca görsel yükleyebilirsiniz.",
    );
  if (detected === "pdf") {
    if (documentType !== "residence" || file.type !== "application/pdf")
      throw new InstallmentFileError("Dosya türü ile içeriği eşleşmiyor.");
    validatePdf(original);
    return {
      buffer: original,
      storedMimeType: "application/pdf" as const,
      extension: "pdf" as const,
      sizeBytes: original.length,
      sha256: createHash("sha256").update(original).digest("hex"),
      width: null,
      height: null,
    };
  }

  const expectedMime = {
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
  }[detected];
  if (file.type !== expectedMime)
    throw new InstallmentFileError("Dosya türü ile görsel içeriği eşleşmiyor.");

  try {
    const decoder = sharp(original, {
      failOn: "error",
      limitInputPixels: INSTALLMENT_IMAGE_MAX_PIXELS,
    });
    const metadata = await decoder.metadata();
    if (
      metadata.format !== detected ||
      !metadata.width ||
      !metadata.height ||
      metadata.width > INSTALLMENT_IMAGE_MAX_DIMENSION ||
      metadata.height > INSTALLMENT_IMAGE_MAX_DIMENSION ||
      metadata.width * metadata.height > INSTALLMENT_IMAGE_MAX_PIXELS
    )
      throw new InstallmentFileError(
        "Görsel boyutları güvenli sınırların dışında.",
      );
    if (documentType === "signature") await validateSignatureInk(original);

    const transformed = await decoder
      .rotate()
      .webp({ quality: documentType === "signature" ? 92 : 88 })
      .toBuffer({ resolveWithObject: true });
    if (transformed.data.length > INSTALLMENT_FILE_MAX_SIZE)
      throw new InstallmentFileError(
        "İşlenen görsel 4 MB sınırını aşıyor.",
        413,
      );
    return {
      buffer: transformed.data,
      storedMimeType: "image/webp" as const,
      extension: "webp" as const,
      sizeBytes: transformed.data.length,
      sha256: createHash("sha256").update(transformed.data).digest("hex"),
      width: transformed.info.width,
      height: transformed.info.height,
    };
  } catch (error) {
    if (error instanceof InstallmentFileError) throw error;
    throw new InstallmentFileError("Görsel güvenli biçimde çözümlenemedi.");
  }
}
