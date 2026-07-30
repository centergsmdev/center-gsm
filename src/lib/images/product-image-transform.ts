export const PRODUCT_IMAGE_CANVAS_SIZE = 1200;
export const PRODUCT_IMAGE_SAFE_SIZE = 1080;

export type ProductImageTransform = {
  zoom: number;
  offsetX: number;
  offsetY: number;
};

export const DEFAULT_PRODUCT_IMAGE_TRANSFORM: ProductImageTransform = {
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
};
