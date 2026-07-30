import type { Tables, TablesInsert } from "@/types/database";

export type AdminProduct = Tables<"products"> & {
  brand: Tables<"brands">;
  category: Tables<"categories">;
  images: Tables<"product_images">[];
  primaryImage: Tables<"product_images"> | null;
};

export type AdminProductReference = Pick<
  Tables<"brands"> | Tables<"categories">,
  "id" | "name"
>;

export type AdminProductFormValues = Pick<
  TablesInsert<"products">,
  | "name"
  | "slug"
  | "sku"
  | "brand_id"
  | "category_id"
  | "description"
  | "price"
  | "old_price"
  | "stock_quantity"
  | "is_active"
  | "is_featured"
>;

export type AdminProductFilters = {
  query: string;
  brandId: string;
  categoryId: string;
  active: "all" | "active" | "inactive";
  stock: "all" | "in-stock" | "out-of-stock";
  sort: "newest" | "oldest" | "price-asc" | "price-desc" | "stock-desc";
};

export type AdminProductResult<T> =
  { data: T; error: null } | { data: null; error: string };
