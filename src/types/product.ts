export type ProductCategory =
  "Telefon" | "Bilgisayar" | "Tablet" | "Akıllı Saat" | "Kulaklık" | "Aksesuar";

export type CatalogProduct = {
  id: string;
  slug: string;
  brand: string;
  model: string;
  description: string;
  category: ProductCategory;
  price: number;
  previousPrice?: number;
  discountRate?: number;
  monthlyInstallment: number;
  installmentCount: number;
  stockStatus: "in-stock" | "limited" | "out-of-stock";
  availableStock?: number;
  sameDayShipping: boolean;
  freeShipping: boolean;
  rating: number;
  reviewCount: number;
  accent: "graphite" | "silver" | "red" | "blue" | "cream" | "black";
  sku?: string;
  warrantyMonths?: number;
  mainImageUrl?: string;
  imageUrls?: string[];
  variants?: CatalogProductVariant[];
};

export type CatalogProductVariant = {
  id: string;
  name: string;
  sku: string;
  price: number;
  stockQuantity: number;
  attributes: Record<string, string | number | boolean>;
};
