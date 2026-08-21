import "server-only";

import sharp from "sharp";

const MAX_DIMENSION = 1600;
const MAX_INPUT_PIXELS = 24_000_000;

export async function processReviewImage(input: Buffer) {
  const image = sharp(input, {
    failOn: "error",
    limitInputPixels: MAX_INPUT_PIXELS,
    animated: false,
  });
  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height || (metadata.pages ?? 1) > 1)
    throw new Error("invalid_review_image");

  return image
    .rotate()
    .resize({
      width: MAX_DIMENSION,
      height: MAX_DIMENSION,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 85, effort: 4 })
    .toBuffer();
}
