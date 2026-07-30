import type { CatalogProduct } from "@/types/product";

export type CartVariant = {
  id: string;
  colorName?: string;
  colorHex?: string;
  storageValue?: number;
  storageUnit?: "GB" | "TB";
  sku: string;
  barcode?: string;
  price: number;
  previousPrice?: number;
  stockQuantity: number;
};

export type CartItem = {
  productId: string;
  quantity: number;
  product?: CatalogProduct;
  variant?: CartVariant;
};
export type CartLine = {
  id: string;
  product: CatalogProduct;
  quantity: number;
  lineTotal: number;
  variant?: CartVariant;
};

export type CartTotals = {
  listSubtotal: number;
  subtotal: number;
  productDiscount: number;
  campaignDiscount: number;
  couponDiscount: number;
  freeShipping?: boolean;
  shipping: number;
  total: number;
  vatIncluded: number;
};

export type PromotionQuote = {
  subtotal: number;
  campaignDiscount: number;
  couponDiscount: number;
  freeShipping?: boolean;
};
