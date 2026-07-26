import { createClient } from "@/lib/supabase/client";
import type { AdminProductResult } from "@/types/admin-product";
import type { Json, Tables } from "@/types/database";
import type {
  CampaignFormValues,
  CouponFormValues,
  PromotionFilters,
} from "@/types/promotion";

const safeError =
  "İşlem tamamlanamadı. Yetkinizi ve bağlantınızı kontrol edin.";
const duplicateError = (code?: string) =>
  code === "23505" ? "Bu kod veya slug daha önce kullanılmış." : safeError;

export async function getAdminCampaigns(
  filters: PromotionFilters,
): Promise<AdminProductResult<Tables<"campaigns">[]>> {
  const client = createClient();
  if (!client)
    return { data: null, error: "Supabase bağlantısı yapılandırılmamış." };
  let query = client.from("campaigns").select("*");
  if (filters.query.trim())
    query = query.ilike(
      "name",
      `%${filters.query.trim().replace(/[,%()]/g, " ")}%`,
    );
  if (filters.status !== "all")
    query = query.eq("is_active", filters.status === "active");
  const result = await query.order("created_at", { ascending: false });
  return result.error
    ? { data: null, error: safeError }
    : { data: result.data, error: null };
}
export async function createAdminCampaign(
  values: CampaignFormValues,
): Promise<AdminProductResult<Tables<"campaigns">>> {
  const client = createClient();
  if (!client)
    return { data: null, error: "Supabase bağlantısı yapılandırılmamış." };
  const result = await client
    .from("campaigns")
    .insert(values)
    .select("*")
    .single();
  return result.error
    ? { data: null, error: duplicateError(result.error.code) }
    : { data: result.data, error: null };
}
export async function updateAdminCampaign(
  id: string,
  values: CampaignFormValues,
): Promise<AdminProductResult<Tables<"campaigns">>> {
  const client = createClient();
  if (!client)
    return { data: null, error: "Supabase bağlantısı yapılandırılmamış." };
  const result = await client
    .from("campaigns")
    .update(values)
    .eq("id", id)
    .select("*")
    .single();
  return result.error
    ? { data: null, error: duplicateError(result.error.code) }
    : { data: result.data, error: null };
}
export async function deactivateAdminCampaign(id: string) {
  const client = createClient();
  if (!client)
    return { data: null, error: "Supabase bağlantısı yapılandırılmamış." };
  const result = await client
    .from("campaigns")
    .update({ is_active: false })
    .eq("id", id);
  return result.error
    ? { data: null, error: safeError }
    : { data: true, error: null };
}

export async function getAdminCoupons(
  filters: PromotionFilters,
): Promise<AdminProductResult<Tables<"coupons">[]>> {
  const client = createClient();
  if (!client)
    return { data: null, error: "Supabase bağlantısı yapılandırılmamış." };
  let query = client.from("coupons").select("*");
  if (filters.query.trim())
    query = query.ilike(
      "code",
      `%${filters.query.trim().replace(/[,%()]/g, " ")}%`,
    );
  if (filters.status !== "all")
    query = query.eq("is_active", filters.status === "active");
  const result = await query.order("created_at", { ascending: false });
  return result.error
    ? { data: null, error: safeError }
    : { data: result.data, error: null };
}
export async function createAdminCoupon(
  values: CouponFormValues,
): Promise<AdminProductResult<Tables<"coupons">>> {
  const client = createClient();
  if (!client)
    return { data: null, error: "Supabase bağlantısı yapılandırılmamış." };
  const result = await client.rpc("admin_create_coupon", {
    p_coupon: values as unknown as Json,
  });
  if (result.error)
    return { data: null, error: duplicateError(result.error.code) };
  const row = await client
    .from("coupons")
    .select("*")
    .eq("id", result.data)
    .single();
  return row.error
    ? { data: null, error: safeError }
    : { data: row.data, error: null };
}
export async function updateAdminCoupon(
  id: string,
  values: CouponFormValues,
): Promise<AdminProductResult<Tables<"coupons">>> {
  const client = createClient();
  if (!client)
    return { data: null, error: "Supabase bağlantısı yapılandırılmamış." };
  const result = await client.rpc("admin_update_coupon", {
    p_coupon_id: id,
    p_coupon: values as unknown as Json,
  });
  if (result.error || !result.data)
    return { data: null, error: duplicateError(result.error?.code) };
  const row = await client.from("coupons").select("*").eq("id", id).single();
  return row.error
    ? { data: null, error: safeError }
    : { data: row.data, error: null };
}
export async function deactivateAdminCoupon(id: string) {
  const client = createClient();
  if (!client)
    return { data: null, error: "Supabase bağlantısı yapılandırılmamış." };
  const result = await client.rpc("admin_delete_coupon", { p_coupon_id: id });
  return result.error || !result.data
    ? { data: null, error: safeError }
    : { data: true, error: null };
}

export async function getPromotionTargets() {
  const client = createClient();
  if (!client) return { categories: [], brands: [], products: [] };
  const [categories, brands, products] = await Promise.all([
    client.from("categories").select("*").eq("is_active", true).order("name"),
    client.from("brands").select("*").eq("is_active", true).order("name"),
    client.from("products").select("*").eq("is_active", true).order("name"),
  ]);
  return {
    categories: categories.data ?? [],
    brands: brands.data ?? [],
    products: products.data ?? [],
  };
}
