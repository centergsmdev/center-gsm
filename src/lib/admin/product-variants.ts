import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/database";
import type { AdminProductResult } from "@/types/admin-product";

export type VariantColorDraft = Pick<
  Tables<"product_colors">,
  "id" | "name" | "display_name" | "hex_code" | "is_active" | "sort_order"
>;
export type VariantDraft = Pick<
  Tables<"product_variants">,
  | "id"
  | "color_id"
  | "storage_value"
  | "storage_unit"
  | "sku"
  | "barcode"
  | "price"
  | "old_price"
  | "stock_quantity"
  | "is_active"
  | "is_default"
  | "sort_order"
>;
export type VariantStorageOption = { value: number; unit: "GB" | "TB" };

export async function getAdminVariantSetup(productId: string) {
  const client = createClient();
  if (!client)
    return { data: null, error: "Supabase bağlantısı yapılandırılmamış." };
  const [colors, variants, images] = await Promise.all([
    client
      .from("product_colors")
      .select("*")
      .eq("product_id", productId)
      .order("sort_order"),
    client
      .from("product_variants")
      .select("*")
      .eq("product_id", productId)
      .order("sort_order"),
    client
      .from("product_images")
      .select("*")
      .eq("product_id", productId)
      .not("color_id", "is", null)
      .order("sort_order"),
  ]);
  if (colors.error || variants.error || images.error)
    return {
      data: null,
      error:
        "Varyant bilgileri yüklenemedi. Migration'ın uygulandığını doğrulayın.",
    };
  return {
    data: { colors: colors.data, variants: variants.data, images: images.data },
    error: null,
  };
}

export async function saveAdminVariantSetup(
  productId: string,
  colors: VariantColorDraft[],
  variants: VariantDraft[],
): Promise<
  AdminProductResult<{
    colors: Tables<"product_colors">[];
    variants: Tables<"product_variants">[];
  }>
> {
  const client = createClient();
  if (!client)
    return { data: null, error: "Supabase bağlantısı yapılandırılmamış." };
  const colorMap = new Map(colors.map((color) => [color.id, color]));
  const payload = variants.map((variant) => {
    const color = variant.color_id ? colorMap.get(variant.color_id) : null;
    const storage =
      variant.storage_value && variant.storage_unit
        ? `${variant.storage_value} ${variant.storage_unit}`
        : "Standart";
    return {
      ...variant,
      name: `${color?.display_name || color?.name || "Standart"} / ${storage}`,
      attributes: {
        color: color?.name ?? null,
        colorHex: color?.hex_code ?? null,
        storage,
      },
    };
  });
  const saved = await client.rpc("admin_save_product_variant_setup", {
    p_product_id: productId,
    p_colors: colors,
    p_variants: payload,
  });
  if (saved.error) return { data: null, error: variantError(saved.error) };
  const refreshed = await getAdminVariantSetup(productId);
  return refreshed.data
    ? {
        data: {
          colors: refreshed.data.colors,
          variants: refreshed.data.variants,
        },
        error: null,
      }
    : { data: null, error: refreshed.error };
}

function variantError(error: { code?: string; message: string }) {
  if (error.code === "23505") {
    if (error.message.includes("barcode"))
      return "Bu barkod başka bir varyantta kullanılıyor.";
    if (error.message.includes("sku"))
      return "Bu SKU başka bir varyantta kullanılıyor.";
    if (error.message.includes("combination"))
      return "Aynı renk ve depolama kombinasyonu tekrar eklenemez.";
    if (error.message.includes("default"))
      return "Bir ürünün yalnızca bir varsayılan varyantı olabilir.";
  }
  if (error.code === "23514")
    return "Fiyat, stok, sıralama veya depolama değeri geçersiz.";
  if (error.message.includes("color_has_images"))
    return "Rengi silmeden önce bu renge bağlı görselleri silin.";
  return "Varyant bilgileri kaydedilemedi.";
}
