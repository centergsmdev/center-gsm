import { mapSupabaseProduct } from "@/lib/catalog/mapper";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/database";
import type {
  SearchDataSource,
  SearchSuggestionGroups,
} from "@/types/search";
import type { SupabaseCatalogRow } from "@/lib/catalog/types";
import { normalizeSearchTerm } from "@/lib/search/normalize-search";
type BrowserCatalogClient = NonNullable<ReturnType<typeof createClient>>;

const emptySearchGroups: SearchSuggestionGroups = {
  products: [],
  brands: [],
  categories: [],
  recent: [],
  popular: [],
};

async function browserProducts(client: BrowserCatalogClient, query: string) {
  const safe = normalizeSearchTerm(query);
  const [matchingBrands, matchingCategories] = await Promise.all([
    client
      .from("brands")
      .select("id")
      .eq("is_active", true)
      .like("search_name", `%${safe}%`),
    client
      .from("categories")
      .select("id")
      .eq("is_active", true)
      .like("search_name", `%${safe}%`),
  ]);
  if (matchingBrands.error || matchingCategories.error) return null;
  let productQuery = client
    .from("products")
    .select("*")
    .eq("is_active", true)
    .limit(8);
  if (safe) {
    const clauses = [`search_text.like.%${safe}%`];
    if (matchingBrands.data.length)
      clauses.push(
        `brand_id.in.(${matchingBrands.data.map((item) => item.id).join(",")})`,
      );
    if (matchingCategories.data.length)
      clauses.push(
        `category_id.in.(${matchingCategories.data.map((item) => item.id).join(",")})`,
      );
    productQuery = productQuery.or(clauses.join(","));
  }
  const productsResult = await productQuery;
  if (productsResult.error || !productsResult.data.length)
    return productsResult.error ? null : [];
  const products = productsResult.data;
  const productIds = products.map((item) => item.id);
  const [categories, brands, images, variants] = await Promise.all([
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
      .in("product_id", productIds)
      .order("sort_order"),
    client
      .from("product_variants")
      .select("*")
      .in("product_id", productIds)
      .eq("is_active", true),
  ]);
  if (categories.error || brands.error || images.error || variants.error)
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
                (item) => item.product_id === product.id,
              ),
              variants: variants.data.filter(
                (item) => item.product_id === product.id,
              ),
            },
          ]
        : [];
    },
  );
  return rows.map(mapSupabaseProduct);
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
      const [products, brands, categories] = await Promise.all([
        browserProducts(client, query),
        client
          .from("brands")
          .select("*")
          .eq("is_active", true)
          .like("search_name", `%${safe}%`)
          .limit(5),
        client
          .from("categories")
          .select("*")
          .eq("is_active", true)
          .like("search_name", `%${safe}%`)
          .limit(5),
      ]);
      if (!products || brands.error || categories.error)
        return emptySearchGroups;
      return {
        products: products.slice(0, 4).map((product) => ({
          id: `product-${product.id}`,
          kind: "product",
          label: `${product.brand} ${product.model}`,
          description: product.description,
          href: `/urun/${product.slug}`,
          product,
        })),
        brands: brands.data.map((brand) => ({
          id: `brand-${brand.id}`,
          kind: "brand",
          label: brand.name,
          href: `/urunler?marka=${encodeURIComponent(brand.slug)}`,
        })),
        categories: categories.data.map((category) => ({
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
