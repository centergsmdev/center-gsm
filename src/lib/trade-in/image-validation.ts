import "server-only";

import { createHash } from "node:crypto";
import sharp from "sharp";

import { TRADE_IN_MAX_IMAGE_SIZE } from "@/lib/trade-in/constants";

const MAX_PIXELS = 30_000_000;
const MAX_DIMENSION = 8_000;

export class TradeInImageError extends Error {}

function detectedType(buffer: Buffer) {
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
  return null;
}

export async function processTradeInImage(file: File) {
  if (!file.size) throw new TradeInImageError("Seçilen fotoğraf boş.");
  if (file.size > TRADE_IN_MAX_IMAGE_SIZE)
    throw new TradeInImageError("İşlenen her fotoğraf en fazla 1 MB olabilir.");

  const original = Buffer.from(await file.arrayBuffer());
  const detected = detectedType(original);
  const expectedMime = detected
    ? { jpeg: "image/jpeg", png: "image/png", webp: "image/webp" }[detected]
    : null;
  if (!detected || file.type !== expectedMime)
    throw new TradeInImageError(
      "Fotoğrafın gerçek biçimi doğrulanamadı. JPG, PNG veya WebP kullanın.",
    );

  try {
    const image = sharp(original, {
      failOn: "error",
      limitInputPixels: MAX_PIXELS,
    });
    const metadata = await image.metadata();
    if (
      metadata.format !== detected ||
      !metadata.width ||
      !metadata.height ||
      metadata.width > MAX_DIMENSION ||
      metadata.height > MAX_DIMENSION ||
      metadata.width * metadata.height > MAX_PIXELS
    )
      throw new TradeInImageError(
        "Fotoğraf boyutları güvenli sınırların dışında.",
      );

    const transformed = await image
      .rotate()
      .resize({
        width: 1800,
        height: 1800,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 84 })
      .toBuffer({ resolveWithObject: true });
    if (transformed.data.length > TRADE_IN_MAX_IMAGE_SIZE)
      throw new TradeInImageError(
        "Fotoğraf işlendikten sonra 1 MB sınırını aşıyor.",
      );
    return {
      buffer: transformed.data,
      sizeBytes: transformed.data.length,
      sha256: createHash("sha256").update(transformed.data).digest("hex"),
      width: transformed.info.width,
      height: transformed.info.height,
    };
  } catch (error) {
    if (error instanceof TradeInImageError) throw error;
    throw new TradeInImageError("Fotoğraf güvenli biçimde işlenemedi.");
  }
}
