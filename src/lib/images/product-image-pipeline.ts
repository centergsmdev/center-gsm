import sharp from "sharp";

export const PRODUCT_IMAGE_CANVAS_SIZE = 1200;
export const PRODUCT_IMAGE_SAFE_SIZE = 1080;
export const PRODUCT_IMAGE_WEBP_QUALITY = 90;

const WHITE = { r: 255, g: 255, b: 255, alpha: 1 } as const;

export type ProcessedProductImage = {
  buffer: Buffer;
  width: number;
  height: number;
  format: "webp";
};

export async function processProductImage(
  input: Buffer,
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

  const left = Math.floor(
    (PRODUCT_IMAGE_CANVAS_SIZE - normalized.info.width) / 2,
  );
  const top = Math.floor(
    (PRODUCT_IMAGE_CANVAS_SIZE - normalized.info.height) / 2,
  );
  const output = await sharp({
    create: {
      width: PRODUCT_IMAGE_CANVAS_SIZE,
      height: PRODUCT_IMAGE_CANVAS_SIZE,
      channels: 3,
      background: WHITE,
    },
  })
    .composite([{ input: normalized.data, left, top }])
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
