import { normalizeSearchTerm } from "@/lib/search/normalize-search";
import type { Json, Tables } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type SearchClient = SupabaseClient<Database>;

export type SmartSearchIndex = {
  products: Array<{ id: string; text: string }>;
  brands: Array<Tables<"brands">>;
  categories: Array<Tables<"categories">>;
};

function jsonValues(value: Json): string[] {
  if (value == null) return [];
  if (typeof value === "string" || typeof value === "number")
    return [String(value)];
  if (typeof value === "boolean") return [];
  if (Array.isArray(value)) return value.flatMap(jsonValues);
  return Object.values(value).flatMap((item) => jsonValues(item ?? null));
}

function compact(value: string) {
  return normalizeSearchTerm(value).replace(/[\s-]+/g, "");
}

function editDistance(left: string, right: string) {
  const rows = Array.from({ length: left.length + 1 }, (_, index) => index);
  for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
    let diagonal = rows[0];
    rows[0] = rightIndex;
    for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
      const previous = rows[leftIndex];
      const cost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      rows[leftIndex] = Math.min(
        rows[leftIndex] + 1,
        rows[leftIndex - 1] + 1,
        diagonal + cost,
      );
      if (
        leftIndex > 1 &&
        rightIndex > 1 &&
        left[leftIndex - 1] === right[rightIndex - 2] &&
        left[leftIndex - 2] === right[rightIndex - 1]
      ) {
        rows[leftIndex] = Math.min(rows[leftIndex], rows[leftIndex - 2] + 1);
      }
      diagonal = previous;
    }
  }
  return rows[left.length];
}

export function smartSearchScore(query: string, source: string) {
  const normalizedQuery = normalizeSearchTerm(query);
  const normalizedSource = normalizeSearchTerm(source);
  if (!normalizedQuery || !normalizedSource) return 0;
  if (normalizedSource === normalizedQuery) return 100;
  if (normalizedSource.startsWith(normalizedQuery)) return 90;
  if (normalizedSource.includes(normalizedQuery)) return 80;

  const compactQuery = compact(normalizedQuery);
  const compactSource = compact(normalizedSource);
  if (compactQuery && compactSource.includes(compactQuery)) return 75;

  const queryTokens = normalizedQuery.split(" ").filter(Boolean);
  const sourceTokens = normalizedSource.split(" ").filter(Boolean);
  if (
    queryTokens.every((token) =>
      sourceTokens.some((item) => item.includes(token)),
    )
  )
    return 70;

  if (compactQuery.length < 4 || /^\d+$/.test(compactQuery)) return 0;
  const tolerance = compactQuery.length >= 9 ? 2 : 1;
  const candidates = new Set([
    ...sourceTokens,
    ...sourceTokens
      .slice(0, -1)
      .map((item, index) => item + sourceTokens[index + 1]),
  ]);
  for (const candidate of candidates) {
    const compactCandidate = compact(candidate);
    if (
      Math.abs(compactCandidate.length - compactQuery.length) <= tolerance &&
      editDistance(compactQuery, compactCandidate) <= tolerance
    )
      return 55;
  }
  return 0;
}

export function rankSearchEntries<T>(
  entries: T[],
  query: string,
  text: (entry: T) => string,
) {
  return entries
    .map((entry) => ({ entry, score: smartSearchScore(query, text(entry)) }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)
    .map((item) => item.entry);
}

export async function loadSmartSearchIndex(
  client: SearchClient,
): Promise<SmartSearchIndex | null> {
  const [products, variants, colors, brands, categories] = await Promise.all([
    client
      .from("products")
      .select("id,name,sku,description,search_text,brand_id,category_id")
      .eq("is_active", true),
    client
      .from("product_variants")
      .select(
        "product_id,name,sku,barcode,storage_value,storage_unit,attributes,color_id",
      )
      .eq("is_active", true),
    client
      .from("product_colors")
      .select("id,product_id,name,display_name")
      .eq("is_active", true),
    client.from("brands").select("*").eq("is_active", true),
    client.from("categories").select("*").eq("is_active", true),
  ]);
  if (
    products.error ||
    variants.error ||
    colors.error ||
    brands.error ||
    categories.error
  )
    return null;

  const brandNames = new Map(brands.data.map((item) => [item.id, item.name]));
  const categoryNames = new Map(
    categories.data.map((item) => [item.id, item.name]),
  );
  const colorNames = new Map(
    colors.data.map((item) => [item.id, item.display_name ?? item.name]),
  );

  return {
    products: products.data.map((product) => {
      const productVariants = variants.data.filter(
        (variant) => variant.product_id === product.id,
      );
      const productColors = colors.data.filter(
        (color) => color.product_id === product.id,
      );
      return {
        id: product.id,
        text: [
          product.name,
          product.sku,
          product.description,
          product.search_text,
          brandNames.get(product.brand_id),
          categoryNames.get(product.category_id),
          ...productColors.flatMap((color) => [color.name, color.display_name]),
          ...productVariants.flatMap((variant) => [
            variant.name,
            variant.sku,
            variant.barcode,
            variant.color_id ? colorNames.get(variant.color_id) : null,
            variant.storage_value,
            variant.storage_value && variant.storage_unit
              ? `${variant.storage_value} ${variant.storage_unit}`
              : null,
            variant.storage_value && variant.storage_unit
              ? `${variant.storage_value}${variant.storage_unit}`
              : null,
            ...jsonValues(variant.attributes),
          ]),
        ]
          .filter((value) => value != null && value !== "")
          .join(" "),
      };
    }),
    brands: brands.data,
    categories: categories.data,
  };
}

export function smartProductIds(index: SmartSearchIndex, query: string) {
  return rankSearchEntries(index.products, query, (item) => item.text).map(
    (item) => item.id,
  );
}
