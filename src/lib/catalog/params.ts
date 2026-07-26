import type { CatalogFilters, CatalogSort } from "@/lib/catalog/types";

export type CatalogSearchParams = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;
const many = (value: string | string[] | undefined) =>
  value ? (Array.isArray(value) ? value : [value]) : undefined;
const positiveNumber = (value: string | undefined) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
};

export function catalogFiltersFromParams(
  params: CatalogSearchParams,
): CatalogFilters {
  const sortValue = first(params.sirala);
  const sort: CatalogSort = [
    "popular",
    "newest",
    "price-asc",
    "price-desc",
  ].includes(sortValue ?? "")
    ? (sortValue as CatalogSort)
    : "popular";
  return {
    categories: many(params.kategori),
    brands: many(params.marka),
    minPrice: positiveNumber(first(params.minFiyat)),
    maxPrice: positiveNumber(first(params.maxFiyat)),
    stock: first(params.stok) === "var" ? "in-stock" : undefined,
    discount: first(params.indirim) === "var",
    sort,
    page: Math.max(1, positiveNumber(first(params.sayfa)) ?? 1),
    pageSize: 8,
  };
}
