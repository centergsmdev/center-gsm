import type { Tables } from "@/types/database";

export type TaxonomyType = "category" | "brand";
export type AdminCategory = Tables<"categories"> & { product_count: number };
export type AdminBrand = Tables<"brands"> & { product_count: number };
export type AdminTaxonomyItem = AdminCategory | AdminBrand;
export type AdminTaxonomyFilters = {
  query: string;
  status: "all" | "active" | "inactive";
  sort: "newest" | "oldest" | "name-asc" | "name-desc";
};
export type TaxonomyFormValues = {
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  imageUrl: string | null;
};
