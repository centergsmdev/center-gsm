export type ProductCategory =
  "Telefon" | "Bilgisayar" | "Tablet" | "Akıllı Saat" | "Kulaklık" | "Aksesuar";

export type CatalogProduct = {
  id: string;
  slug: string;
  brand: string;
  model: string;
  description: string;
  shortDescription?: string;
  category: ProductCategory;
  price: number;
  previousPrice?: number;
  discountRate?: number;
  monthlyInstallment: number;
  installmentCount: number;
  showInstallments?: boolean;
  installmentNote?: string;
  stockStatus: "in-stock" | "limited" | "out-of-stock";
  availableStock?: number;
  sameDayShipping: boolean;
  freeShipping: boolean;
  rating: number;
  reviewCount: number;
  accent: "graphite" | "silver" | "red" | "blue" | "cream" | "black";
  sku?: string;
  variantTitle?: string;
  warrantyMonths?: number;
  mainImageUrl?: string;
  imageUrls?: string[];
  colors?: CatalogProductColor[];
  variants?: CatalogProductVariant[];
};

export type CatalogProductColor = {
  id: string;
  name: string;
  displayName: string;
  hexCode: string;
  imageUrls: string[];
};

export type CatalogProductVariant = {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  price: number;
  previousPrice?: number;
  stockQuantity: number;
  colorId?: string;
  storageValue?: number;
  storageUnit?: "GB" | "TB";
  isDefault?: boolean;
  variantTitle?: string;
  sortOrder?: number;
  attributes: Record<string, string | number | boolean>;
};
