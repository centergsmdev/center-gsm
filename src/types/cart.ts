import type { CatalogProduct } from "@/types/product";

export type CartItem = {
  productId: string;
  quantity: number;
  product?: CatalogProduct;
};
export type CartLine = {
  product: CatalogProduct;
  quantity: number;
  lineTotal: number;
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
