import {
  catalogSearchDataSource,
  getCatalogSuggestions,
} from "@/lib/search/catalog-search";
import { mapSupabaseProduct } from "@/lib/catalog/mapper";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/database";
import type {
  SearchDataSource,
  SearchSuggestion,
  SearchSuggestionGroups,
} from "@/types/search";
import type { SupabaseCatalogRow } from "@/lib/catalog/types";
type BrowserCatalogClient = NonNullable<ReturnType<typeof createClient>>;

const recent = ["Kablosuz kulaklık", "Nova X Pro", "Dizüstü bilgisayar"];
const popular = [
  "Akıllı telefon",
  "Oyuncu bilgisayarı",
  "Akıllı saat",
  "Tablet",
];
const normalize = (value: string) => value.toLocaleLowerCase("tr-TR").trim();
function termSuggestions(
  terms: string[],
  kind: SearchSuggestion["kind"],
  query: string,
) {
  const normalized = normalize(query);
  return terms
    .filter((term) => !normalized || normalize(term).includes(normalized))
    .slice(0, 5)
    .map((term, index): SearchSuggestion => ({
      id: `${kind}-${index}-${term}`,
      kind,
      label: term,
      href: `/arama?q=${encodeURIComponent(term)}`,
    }));
}

async function browserProducts(client: BrowserCatalogClient, query: string) {
  const safe = query.replace(/[^\p{L}\p{N}\s-]/gu, " ").trim();
  let productQuery = client
    .from("products")
    .select("*")
    .eq("is_active", true)
    .limit(8);
  if (safe)
    productQuery = productQuery.or(
      `name.ilike.%${safe}%,description.ilike.%${safe}%,short_description.ilike.%${safe}%,sku.ilike.%${safe}%`,
    );
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
    if (!client) return catalogSearchDataSource.products(query);
    try {
      return (
        (await browserProducts(client, query)) ??
        catalogSearchDataSource.products(query)
      );
    } catch {
      return catalogSearchDataSource.products(query);
    }
  },
  async suggestions(query): Promise<SearchSuggestionGroups> {
    const client = createClient();
    if (!client) return getCatalogSuggestions(query);
    try {
      const safe = query.replace(/[^\p{L}\p{N}\s-]/gu, " ").trim();
      const [products, brands, categories] = await Promise.all([
        browserProducts(client, query),
        client
          .from("brands")
          .select("*")
          .eq("is_active", true)
          .ilike("name", `%${safe}%`)
          .limit(5),
        client
          .from("categories")
          .select("*")
          .eq("is_active", true)
          .ilike("name", `%${safe}%`)
          .limit(5),
      ]);
      if (!products || brands.error || categories.error)
        return getCatalogSuggestions(query);
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
        recent: termSuggestions(recent, "recent", query),
        popular: termSuggestions(popular, "popular", query),
      };
    } catch {
      return getCatalogSuggestions(query);
    }
  },
};
