import type { CatalogProduct } from "@/types/product";
import type { Tables } from "@/types/database";

export type CatalogSort = "popular" | "newest" | "price-asc" | "price-desc";
export type CatalogFilters = {
  query?: string;
  categories?: string[];
  brands?: string[];
  minPrice?: number;
  maxPrice?: number;
  stock?: "in-stock";
  discount?: boolean;
  sort?: CatalogSort;
  page?: number;
  pageSize?: number;
  featured?: boolean;
};
export type CatalogListResult = {
  data: CatalogProduct[];
  total: number;
  page: number;
  pageSize: number;
  error: boolean;
  source: "supabase" | "fallback";
};
export type CatalogItemResult = {
  data: CatalogProduct | null;
  error: boolean;
  source: "supabase" | "fallback";
};
export type CatalogCollectionResult<T> = {
  data: T[];
  error: boolean;
  source: "supabase" | "fallback";
};
export type CatalogTaxonomy = Pick<
  Tables<"categories">,
  "id" | "name" | "slug"
> &
  Partial<Pick<Tables<"categories">, "image_url">>;
export type BrandTaxonomy = Pick<Tables<"brands">, "id" | "name" | "slug"> &
  Partial<Pick<Tables<"brands">, "logo_url">>;
export type SupabaseCatalogRow = Tables<"products"> & {
  availableStock: number;
  category: CatalogTaxonomy;
  brand: BrandTaxonomy;
  images: Tables<"product_images">[];
  colors?: Tables<"product_colors">[];
  variants: Tables<"product_variants">[];
};
