import { createClient } from "@/lib/supabase/client";
import type { AdminProductResult } from "@/types/admin-product";
import type { AdminBrand, AdminCategory, AdminTaxonomyFilters, TaxonomyFormValues } from "@/types/admin-taxonomy";
import type { Tables } from "@/types/database";

const SAFE_ERROR = "İşlem tamamlanamadı. Yetkinizi ve bağlantınızı kontrol edip tekrar deneyin.";
const connection = () => createClient();
const duplicateError = (code?: string) => code === "23505" ? "Bu slug daha önce kullanılmış. Benzersiz bir slug girin." : SAFE_ERROR;
const orderMap = { newest: ["created_at", false], oldest: ["created_at", true], "name-asc": ["name", true], "name-desc": ["name", false] } as const;

async function productCounts(column: "category_id" | "brand_id"): Promise<Map<string, number> | null> {
  const client = connection(); if (!client) return null;
  const result = await client
    .from("products")
    .select("category_id,brand_id");
  if (result.error) return null;
  const counts = new Map<string, number>();
  for (const row of result.data) { const id = row[column]; counts.set(id, (counts.get(id) ?? 0) + 1); }
  return counts;
}

export async function getAdminCategories(filters: AdminTaxonomyFilters): Promise<AdminProductResult<AdminCategory[]>> {
  const client = connection(); if (!client) return { data: null, error: "Supabase bağlantısı yapılandırılmamış." };
  let query = client.from("categories").select("*");
  if (filters.query.trim()) query = query.ilike("name", `%${filters.query.trim().replace(/[,%()]/g, " ")}%`);
  if (filters.status !== "all") query = query.eq("is_active", filters.status === "active");
  const [column, ascending] = orderMap[filters.sort]; const [rows, counts] = await Promise.all([query.order(column, { ascending }), productCounts("category_id")]);
  if (rows.error || !counts) return { data: null, error: SAFE_ERROR };
  return { data: rows.data.map((item) => ({ ...item, product_count: counts.get(item.id) ?? 0 })), error: null };
}

export async function getAdminBrands(filters: AdminTaxonomyFilters): Promise<AdminProductResult<AdminBrand[]>> {
  const client = connection(); if (!client) return { data: null, error: "Supabase bağlantısı yapılandırılmamış." };
  let query = client.from("brands").select("*");
  if (filters.query.trim()) query = query.ilike("name", `%${filters.query.trim().replace(/[,%()]/g, " ")}%`);
  if (filters.status !== "all") query = query.eq("is_active", filters.status === "active");
  const [column, ascending] = orderMap[filters.sort]; const [rows, counts] = await Promise.all([query.order(column, { ascending }), productCounts("brand_id")]);
  if (rows.error || !counts) return { data: null, error: SAFE_ERROR };
  return { data: rows.data.map((item) => ({ ...item, product_count: counts.get(item.id) ?? 0 })), error: null };
}

export async function createAdminCategory(values: TaxonomyFormValues): Promise<AdminProductResult<Tables<"categories">>> {
  const client = connection(); if (!client) return { data: null, error: "Supabase bağlantısı yapılandırılmamış." };
  const result = await client.from("categories").insert({ name: values.name, slug: values.slug, description: values.description, image_url: values.imageUrl, is_active: values.is_active }).select("*").single();
  return result.error ? { data: null, error: duplicateError(result.error.code) } : { data: result.data, error: null };
}
export async function updateAdminCategory(id: string, values: TaxonomyFormValues): Promise<AdminProductResult<Tables<"categories">>> {
  const client = connection(); if (!client) return { data: null, error: "Supabase bağlantısı yapılandırılmamış." };
  const result = await client.from("categories").update({ name: values.name, slug: values.slug, description: values.description, image_url: values.imageUrl, is_active: values.is_active }).eq("id", id).select("*").single();
  return result.error ? { data: null, error: duplicateError(result.error.code) } : { data: result.data, error: null };
}
export async function deactivateAdminCategory(id: string) { return deactivate("categories", id); }

export async function createAdminBrand(values: TaxonomyFormValues): Promise<AdminProductResult<Tables<"brands">>> {
  const client = connection(); if (!client) return { data: null, error: "Supabase bağlantısı yapılandırılmamış." };
  const result = await client.from("brands").insert({ name: values.name, slug: values.slug, description: values.description, logo_url: values.imageUrl, is_active: values.is_active }).select("*").single();
  return result.error ? { data: null, error: duplicateError(result.error.code) } : { data: result.data, error: null };
}
export async function updateAdminBrand(id: string, values: TaxonomyFormValues): Promise<AdminProductResult<Tables<"brands">>> {
  const client = connection(); if (!client) return { data: null, error: "Supabase bağlantısı yapılandırılmamış." };
  const result = await client.from("brands").update({ name: values.name, slug: values.slug, description: values.description, logo_url: values.imageUrl, is_active: values.is_active }).eq("id", id).select("*").single();
  return result.error ? { data: null, error: duplicateError(result.error.code) } : { data: result.data, error: null };
}
export async function deactivateAdminBrand(id: string) { return deactivate("brands", id); }

async function deactivate(table: "categories" | "brands", id: string): Promise<AdminProductResult<true>> {
  const client = connection(); if (!client) return { data: null, error: "Supabase bağlantısı yapılandırılmamış." };
  const result = await client.from(table).update({ is_active: false }).eq("id", id);
  return result.error ? { data: null, error: SAFE_ERROR } : { data: true, error: null };
}
