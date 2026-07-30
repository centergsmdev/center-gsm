import { catalogProducts } from "@/data/catalog-products";
import { mapSupabaseProduct } from "@/lib/catalog/mapper";
import type { SupabaseCatalogRow } from "@/lib/catalog/types";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/database";
import type { CatalogProduct } from "@/types/product";

type FavoriteResult<T> =
  { success: true; data: T } | { success: false; data: T };
type BrowserClient = NonNullable<ReturnType<typeof createClient>>;

async function resolveProductId(
  client: BrowserClient,
  productId: string,
): Promise<string | null> {
  const fallback = catalogProducts.find((product) => product.id === productId);
  const query = client.from("products").select("*").eq("is_active", true);
  const result = fallback
    ? await query.eq("slug", fallback.slug).maybeSingle()
    : await query.eq("id", productId).maybeSingle();
  return result.error ? null : (result.data?.id ?? null);
}

async function hydrateProducts(
  client: BrowserClient,
  products: Tables<"products">[],
): Promise<CatalogProduct[] | null> {
  if (!products.length) return [];
  const productIds = products.map((product) => product.id);
  const categoryIds = [...new Set(products.map((item) => item.category_id))];
  const brandIds = [...new Set(products.map((item) => item.brand_id))];
  const [categories, brands, images, variants] = await Promise.all([
    client.from("categories").select("*").in("id", categoryIds),
    client.from("brands").select("*").in("id", brandIds),
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
  const rows: SupabaseCatalogRow[] = products.flatMap((product) => {
    const category = categoryMap.get(product.category_id);
    const brand = brandMap.get(product.brand_id);
    if (!category || !brand) return [];
    return [
      {
        ...product,
        availableStock: product.stock_quantity,
        category,
        brand,
        images: images.data.filter(
          (item) => item.product_id === product.id && item.color_id == null,
        ),
        variants: variants.data.filter(
          (item) => item.product_id === product.id,
        ),
      },
    ];
  });
  return rows.map(mapSupabaseProduct);
}

export async function getUserFavorites(
  userId: string,
): Promise<FavoriteResult<CatalogProduct[]>> {
  const client = createClient();
  if (!client) return { success: false, data: [] };
  const favorites = await client
    .from("favorites")
    .select("product_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (favorites.error) return { success: false, data: [] };
  const productIds = favorites.data.map((item) => item.product_id);
  if (!productIds.length) return { success: true, data: [] };
  const products = await client
    .from("products")
    .select("*")
    .in("id", productIds)
    .eq("is_active", true);
  if (products.error) return { success: false, data: [] };
  const hydrated = await hydrateProducts(client, products.data);
  if (!hydrated) return { success: false, data: [] };
  const order = new Map(productIds.map((id, index) => [id, index]));
  hydrated.sort(
    (a, b) =>
      (order.get(
        products.data.find((item) => item.slug === a.slug)?.id ?? "",
      ) ?? 0) -
      (order.get(
        products.data.find((item) => item.slug === b.slug)?.id ?? "",
      ) ?? 0),
  );
  return { success: true, data: hydrated };
}

export async function addUserFavorite(userId: string, productId: string) {
  const client = createClient();
  if (!client) return { success: false } as const;
  const resolvedId = await resolveProductId(client, productId);
  if (!resolvedId) return { success: false } as const;
  const result = await client
    .from("favorites")
    .upsert(
      { user_id: userId, product_id: resolvedId },
      { onConflict: "user_id,product_id", ignoreDuplicates: true },
    );
  return { success: !result.error } as const;
}

export async function removeUserFavorite(userId: string, productId: string) {
  const client = createClient();
  if (!client) return { success: false } as const;
  const resolvedId = await resolveProductId(client, productId);
  if (!resolvedId) return { success: false } as const;
  const result = await client
    .from("favorites")
    .delete()
    .eq("user_id", userId)
    .eq("product_id", resolvedId);
  return { success: !result.error } as const;
}

export async function syncLocalFavoritesToUser(
  userId: string,
  productIds: string[],
) {
  const client = createClient();
  if (!client) return { success: false } as const;
  const resolved = await Promise.all(
    [...new Set(productIds)].map((id) => resolveProductId(client, id)),
  );
  if (resolved.some((id) => id === null)) return { success: false } as const;
  const validIds = resolved.filter((id): id is string => id !== null);
  if (!validIds.length) return { success: true } as const;
  const result = await client.from("favorites").upsert(
    validIds.map((productId) => ({ user_id: userId, product_id: productId })),
    { onConflict: "user_id,product_id", ignoreDuplicates: true },
  );
  return { success: !result.error } as const;
}
