import { mapSupabaseProduct } from "@/lib/catalog/mapper";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/database";
import type { SearchDataSource, SearchSuggestionGroups } from "@/types/search";
import type { SupabaseCatalogRow } from "@/lib/catalog/types";
import { normalizeSearchTerm } from "@/lib/search/normalize-search";
import {
  loadSmartSearchIndex,
  rankSearchEntries,
  smartProductIds,
  type SmartSearchIndex,
} from "@/lib/search/smart-search";
type BrowserCatalogClient = NonNullable<ReturnType<typeof createClient>>;

let cachedIndex: { value: SmartSearchIndex; expiresAt: number } | null = null;

async function browserSearchIndex(client: BrowserCatalogClient) {
  if (cachedIndex && cachedIndex.expiresAt > Date.now())
    return cachedIndex.value;
  const value = await loadSmartSearchIndex(client);
  if (value) cachedIndex = { value, expiresAt: Date.now() + 60_000 };
  return value;
}

const emptySearchGroups: SearchSuggestionGroups = {
  products: [],
  brands: [],
  categories: [],
  recent: [],
  popular: [],
};

async function browserProducts(client: BrowserCatalogClient, query: string) {
  const safe = normalizeSearchTerm(query);
  const index = await browserSearchIndex(client);
  if (!index) return null;
  const productIds = smartProductIds(index, safe).slice(0, 8);
  if (safe && !productIds.length) return [];
  let productQuery = client
    .from("products")
    .select("*")
    .eq("is_active", true)
    .limit(8);
  if (safe) productQuery = productQuery.in("id", productIds);
  const productsResult = await productQuery;
  if (productsResult.error || !productsResult.data.length)
    return productsResult.error ? null : [];
  const products = productsResult.data;
  const hydratedProductIds = products.map((item) => item.id);
  const [categories, brands, images, variants, colors] = await Promise.all([
    client
      .from("categories")
      .select("*")
      .in("id", [...new Set(products.map((item) => item.category_id))]),
    client
      .from("brands")
      .select("*")
      .in("id", [...new Set(products.map((item) => item.brand_id))]),
    client
      .from("product_images")
      .select("*")
      .in("product_id", hydratedProductIds)
      .order("sort_order"),
    client
      .from("product_variants")
      .select("*")
      .in("product_id", hydratedProductIds)
      .eq("is_active", true),
    client
      .from("product_colors")
      .select("*")
      .in("product_id", hydratedProductIds)
      .eq("is_active", true),
  ]);
  if (
    categories.error ||
    brands.error ||
    images.error ||
    variants.error ||
    colors.error
  )
    return null;
  const categoryMap = new Map(categories.data.map((item) => [item.id, item]));
  const brandMap = new Map(brands.data.map((item) => [item.id, item]));
  const rows: SupabaseCatalogRow[] = products.flatMap(
    (product: Tables<"products">) => {
      const category = categoryMap.get(product.category_id);
      const brand = brandMap.get(product.brand_id);
      return category && brand
        ? [
            {
              ...product,
              availableStock: product.stock_quantity,
              category,
              brand,
              images: images.data.filter(
                (item) =>
                  item.product_id === product.id && item.color_id == null,
              ),
              variants: variants.data.filter(
                (item) => item.product_id === product.id,
              ),
              colors: colors.data.filter(
                (item) => item.product_id === product.id,
              ),
            },
          ]
        : [];
    },
  );
  const mapped = rows.map(mapSupabaseProduct);
  return safe
    ? productIds.flatMap((id) => mapped.filter((product) => product.id === id))
    : mapped;
}

export const supabaseSearchDataSource: SearchDataSource = {
  async products(query) {
    const client = createClient();
    if (!client) return [];
    try {
      return (await browserProducts(client, query)) ?? [];
    } catch {
      return [];
    }
  },
  async suggestions(query): Promise<SearchSuggestionGroups> {
    const client = createClient();
    if (!client) return emptySearchGroups;
    try {
      const safe = normalizeSearchTerm(query);
      const [products, index] = await Promise.all([
        browserProducts(client, query),
        browserSearchIndex(client),
      ]);
      if (!products || !index) return emptySearchGroups;
      const brands = rankSearchEntries(
        index.brands,
        safe,
        (brand) => brand.name,
      ).slice(0, 5);
      const categories = rankSearchEntries(
        index.categories,
        safe,
        (category) => `${category.name} ${category.description ?? ""}`,
      ).slice(0, 5);
      return {
        products: products.slice(0, 4).map((product) => ({
          id: `product-${product.id}`,
          kind: "product",
          label: `${product.brand} ${product.model}`,
          description: product.description,
          href: `/urun/${product.slug}`,
          product,
        })),
        brands: brands.map((brand) => ({
          id: `brand-${brand.id}`,
          kind: "brand",
          label: brand.name,
          href: `/urunler?marka=${encodeURIComponent(brand.slug)}`,
        })),
        categories: categories.map((category) => ({
          id: `category-${category.id}`,
          kind: "category",
          label: category.name,
          href: `/urunler?kategori=${encodeURIComponent(category.slug)}`,
        })),
        recent: [],
        popular: [],
      };
    } catch {
      return emptySearchGroups;
    }
  },
};
