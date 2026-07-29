import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";
import type {
  AdminProduct,
  AdminProductFilters,
  AdminProductFormValues,
  AdminProductReference,
  AdminProductResult,
} from "@/types/admin-product";
import type { Database, Tables } from "@/types/database";

const SAFE_ERROR =
  "İşlem tamamlanamadı. Yetkinizi ve bağlantınızı kontrol edip tekrar deneyin.";
const NOT_CONFIGURED = "Supabase bağlantısı yapılandırılmamış.";

function browserClient(): AdminProductResult<SupabaseClient<Database>> {
  const client = createClient();
  return client
    ? { data: client, error: null }
    : { data: null, error: NOT_CONFIGURED };
}

async function composeProducts(
  client: SupabaseClient<Database>,
  products: Tables<"products">[],
): Promise<AdminProductResult<AdminProduct[]>> {
  if (!products.length) return { data: [], error: null };
  const productIds = products.map((item) => item.id);
  const [brands, categories, images] = await Promise.all([
    client
      .from("brands")
      .select("*")
      .in("id", [...new Set(products.map((item) => item.brand_id))]),
    client
      .from("categories")
      .select("*")
      .in("id", [...new Set(products.map((item) => item.category_id))]),
    client
      .from("product_images")
      .select("*")
      .in("product_id", productIds)
      .order("sort_order", { ascending: true }),
  ]);
  if (brands.error || categories.error || images.error)
    return { data: null, error: SAFE_ERROR };
  const brandMap = new Map(brands.data.map((item) => [item.id, item]));
  const categoryMap = new Map(categories.data.map((item) => [item.id, item]));
  const rows = products.flatMap((product) => {
    const brand = brandMap.get(product.brand_id);
    const category = categoryMap.get(product.category_id);
    if (!brand || !category) return [];
    const productImages = images.data.filter(
      (image) => image.product_id === product.id,
    );
    return [
      {
        ...product,
        brand,
        category,
        images: productImages,
        primaryImage:
          productImages.find((image) => image.is_primary) ??
          productImages[0] ??
          null,
      },
    ];
  });
  return { data: rows, error: null };
}

export async function getAdminProducts(
  filters: AdminProductFilters,
): Promise<AdminProductResult<AdminProduct[]>> {
  const connection = browserClient();
  if (!connection.data) return connection;
  let query = connection.data.from("products").select("*");
  if (filters.query.trim()) {
    const value = filters.query.trim().replace(/[,%()]/g, " ");
    const brandResult = await connection.data
      .from("brands")
      .select("id")
      .ilike("name", `%${value}%`);
    const brandIds = brandResult.data?.map((brand) => brand.id) ?? [];
    const conditions = [`name.ilike.%${value}%`, `sku.ilike.%${value}%`];
    if (brandIds.length) conditions.push(`brand_id.in.(${brandIds.join(",")})`);
    query = query.or(conditions.join(","));
  }
  if (filters.brandId) query = query.eq("brand_id", filters.brandId);
  if (filters.categoryId) query = query.eq("category_id", filters.categoryId);
  if (filters.active !== "all")
    query = query.eq("is_active", filters.active === "active");
  if (filters.stock === "in-stock") query = query.gt("stock_quantity", 0);
  if (filters.stock === "out-of-stock") query = query.eq("stock_quantity", 0);
  const sortMap = {
    newest: ["created_at", false],
    oldest: ["created_at", true],
    "price-asc": ["price", true],
    "price-desc": ["price", false],
    "stock-desc": ["stock_quantity", false],
  } as const;
  const [column, ascending] = sortMap[filters.sort];
  const result = await query.order(column, { ascending });
  if (result.error) return { data: null, error: SAFE_ERROR };
  return composeProducts(connection.data, result.data);
}

export async function getAdminProduct(
  id: string,
): Promise<AdminProductResult<AdminProduct | null>> {
  const connection = browserClient();
  if (!connection.data) return connection;
  const result = await connection.data
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (result.error) return { data: null, error: SAFE_ERROR };
  if (!result.data) return { data: null, error: null };
  const composed = await composeProducts(connection.data, [result.data]);
  return composed.data
    ? { data: composed.data[0] ?? null, error: null }
    : composed;
}

export async function getAdminProductReferences(): Promise<
  AdminProductResult<{
    brands: AdminProductReference[];
    categories: AdminProductReference[];
  }>
> {
  const connection = browserClient();
  if (!connection.data) return connection;
  const [brands, categories] = await Promise.all([
    connection.data
      .from("brands")
      .select("id,name")
      .eq("is_active", true)
      .order("name"),
    connection.data
      .from("categories")
      .select("id,name")
      .eq("is_active", true)
      .order("sort_order"),
  ]);
  if (brands.error || categories.error)
    return { data: null, error: SAFE_ERROR };
  return {
    data: { brands: brands.data, categories: categories.data },
    error: null,
  };
}

export async function createAdminProduct(
  values: AdminProductFormValues,
): Promise<AdminProductResult<Tables<"products">>> {
  const connection = browserClient();
  if (!connection.data) return connection;
  const result = await connection.data
    .from("products")
    .insert(values)
    .select("*")
    .single();
  return result.error
    ? { data: null, error: SAFE_ERROR }
    : { data: result.data, error: null };
}

export async function updateAdminProduct(
  id: string,
  values: AdminProductFormValues,
): Promise<AdminProductResult<Tables<"products">>> {
  const connection = browserClient();
  if (!connection.data) return connection;
  const { stock_quantity: _stockQuantity, ...safeValues } = values;
  void _stockQuantity;
  const result = await connection.data
    .from("products")
    .update(safeValues)
    .eq("id", id)
    .select("*")
    .single();
  return result.error
    ? { data: null, error: SAFE_ERROR }
    : { data: result.data, error: null };
}

export async function deactivateAdminProduct(
  id: string,
): Promise<AdminProductResult<true>> {
  return setAdminProductActive(id, false);
}

export async function setAdminProductActive(
  id: string,
  isActive: boolean,
): Promise<AdminProductResult<true>> {
  try {
    const response = await fetch(`/api/admin/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    });
    const result = (await response.json()) as AdminProductResult<true>;
    return response.ok && result.data
      ? result
      : { data: null, error: result.error ?? SAFE_ERROR };
  } catch {
    return { data: null, error: SAFE_ERROR };
  }
}

export async function permanentlyDeleteAdminProduct(
  id: string,
): Promise<AdminProductResult<true>> {
  try {
    const response = await fetch(`/api/admin/products/${id}`, {
      method: "DELETE",
    });
    const result = (await response.json()) as AdminProductResult<true>;
    return response.ok && result.data
      ? result
      : { data: null, error: result.error ?? SAFE_ERROR };
  } catch {
    return { data: null, error: SAFE_ERROR };
  }
}
