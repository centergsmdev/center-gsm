import sharp from "sharp";

import {
  DEFAULT_PRODUCT_IMAGE_TRANSFORM,
  PRODUCT_IMAGE_CANVAS_SIZE,
  PRODUCT_IMAGE_SAFE_SIZE,
  type ProductImageTransform,
} from "@/lib/images/product-image-transform";

export const PRODUCT_IMAGE_WEBP_QUALITY = 90;

const WHITE = { r: 255, g: 255, b: 255, alpha: 1 } as const;

export type ProcessedProductImage = {
  buffer: Buffer;
  width: number;
  height: number;
  format: "webp";
};

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

export async function processProductImage(
  input: Buffer,
  requestedTransform: ProductImageTransform = DEFAULT_PRODUCT_IMAGE_TRANSFORM,
): Promise<ProcessedProductImage> {
  const source = sharp(input, {
    failOn: "error",
    limitInputPixels: 100_000_000,
  });
  const metadata = await source.metadata();

  if (!metadata.width || !metadata.height)
    throw new Error("Görsel ölçüleri okunamadı.");
  if ((metadata.pages ?? 1) > 1)
    throw new Error("Hareketli görseller desteklenmiyor.");

  const normalized = await source
    .rotate()
    .flatten({ background: WHITE })
    .resize({
      width: PRODUCT_IMAGE_SAFE_SIZE,
      height: PRODUCT_IMAGE_SAFE_SIZE,
      fit: "inside",
      withoutEnlargement: false,
      kernel: sharp.kernel.lanczos3,
    })
    .png()
    .toBuffer({ resolveWithObject: true });

  const zoom = clamp(requestedTransform.zoom, 0.4, 1.1);
  const width = Math.min(
    PRODUCT_IMAGE_CANVAS_SIZE,
    Math.max(1, Math.round(normalized.info.width * zoom)),
  );
  const height = Math.min(
    PRODUCT_IMAGE_CANVAS_SIZE,
    Math.max(1, Math.round(normalized.info.height * zoom)),
  );
  const positioned = await sharp(normalized.data)
    .resize({ width, height, fit: "fill", kernel: sharp.kernel.lanczos3 })
    .png()
    .toBuffer();
  const availableX = PRODUCT_IMAGE_CANVAS_SIZE - width;
  const availableY = PRODUCT_IMAGE_CANVAS_SIZE - height;
  const offsetX = clamp(requestedTransform.offsetX, -1, 1);
  const offsetY = clamp(requestedTransform.offsetY, -1, 1);
  const left = Math.round((availableX / 2) * (1 + offsetX));
  const top = Math.round((availableY / 2) * (1 + offsetY));
  const output = await sharp({
    create: {
      width: PRODUCT_IMAGE_CANVAS_SIZE,
      height: PRODUCT_IMAGE_CANVAS_SIZE,
      channels: 3,
      background: WHITE,
    },
  })
    .composite([{ input: positioned, left, top }])
    .webp({
      quality: PRODUCT_IMAGE_WEBP_QUALITY,
      effort: 5,
      smartSubsample: true,
    })
    .toBuffer({ resolveWithObject: true });

  if (
    output.info.width !== PRODUCT_IMAGE_CANVAS_SIZE ||
    output.info.height !== PRODUCT_IMAGE_CANVAS_SIZE ||
    output.info.format !== "webp"
  )
    throw new Error("Görsel standardı doğrulanamadı.");

  return {
    buffer: output.data,
    width: output.info.width,
    height: output.info.height,
    format: "webp",
  };
}
