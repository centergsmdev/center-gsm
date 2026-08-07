import { createClient } from "@/lib/supabase/client";
import type { AdvertisementProduct } from "@/types/advertisement-center";
import type {
  AdvertisementCenterSettings,
  AdvertisementProductSettings,
} from "@/types/database";

type Result<T> = { data: T | null; error: string | null };

function scoreProduct(input: {
  name: string;
  sku: string;
  description: string | null;
  price: number;
  oldPrice: number | null;
  stock: number;
  imageUrl: string | null;
  activeVariantCount: number;
}) {
  let score = 0;
  const issues: string[] = [];
  if (input.imageUrl) score += 20;
  else issues.push("Ana görsel eksik");
  if (input.name.trim().length >= 12 && input.name.length <= 100) score += 15;
  else issues.push("Başlık uzunluğu iyileştirilmeli");
  if ((input.description?.replace(/<[^>]+>/g, "").trim().length ?? 0) >= 80)
    score += 15;
  else issues.push("Açıklama yetersiz");
  if (input.price > 0) score += 15;
  else issues.push("Geçerli fiyat eksik");
  if (input.oldPrice && input.oldPrice > input.price) score += 10;
  else issues.push("İndirim avantajı yok");
  if (input.activeVariantCount > 0) score += 10;
  else issues.push("Aktif varyant yok");
  if (input.stock > 0) score += 10;
  else issues.push("Stok bulunmuyor");
  if (input.sku.trim()) score += 5;
  else issues.push("SKU eksik");
  return { score, issues };
}

export async function getAdvertisementCenterData(): Promise<
  Result<{
    products: AdvertisementProduct[];
    settings: AdvertisementCenterSettings;
  }>
> {
  const supabase = createClient();
  if (!supabase)
    return { data: null, error: "Supabase bağlantısı bulunamadı." };
  const [
    productsResult,
    categoriesResult,
    imagesResult,
    variantsResult,
    productSettingsResult,
    settingsResult,
  ] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id,name,slug,sku,description,price,old_price,stock_quantity,category_id",
      )
      .eq("is_active", true)
      .order("created_at", { ascending: false }),
    supabase.from("categories").select("id,name"),
    supabase
      .from("product_images")
      .select("product_id,url,is_primary,sort_order")
      .order("sort_order"),
    supabase.from("product_variants").select("product_id,is_active"),
    supabase.from("advertisement_product_settings").select("*"),
    supabase
      .from("advertisement_center_settings")
      .select("*")
      .eq("id", true)
      .maybeSingle(),
  ]);
  const error =
    productsResult.error ??
    categoriesResult.error ??
    imagesResult.error ??
    variantsResult.error ??
    productSettingsResult.error ??
    settingsResult.error;
  if (error) return { data: null, error: error.message };
  const categories = new Map(
    (categoriesResult.data ?? []).map((item) => [item.id, item.name]),
  );
  const images = new Map<string, string>();
  for (const image of imagesResult.data ?? []) {
    if (image.is_primary || !images.has(image.product_id))
      images.set(image.product_id, image.url);
  }
  const variants = new Map<string, { total: number; active: number }>();
  for (const variant of variantsResult.data ?? []) {
    const value = variants.get(variant.product_id) ?? { total: 0, active: 0 };
    value.total += 1;
    if (variant.is_active) value.active += 1;
    variants.set(variant.product_id, value);
  }
  const productSettings = new Map(
    (productSettingsResult.data ?? []).map((item) => [item.product_id, item]),
  );
  const products = (productsResult.data ?? []).map((product) => {
    const variant = variants.get(product.id) ?? { total: 0, active: 0 };
    const imageUrl = images.get(product.id) ?? null;
    const analysis = scoreProduct({
      name: product.name,
      sku: product.sku,
      description: product.description,
      price: product.price,
      oldPrice: product.old_price,
      stock: product.stock_quantity,
      imageUrl,
      activeVariantCount: variant.active,
    });
    const saved = productSettings.get(product.id);
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      description: product.description,
      price: product.price,
      oldPrice: product.old_price,
      stock: product.stock_quantity,
      categoryId: product.category_id,
      categoryName: categories.get(product.category_id) ?? "Kategorisiz",
      imageUrl,
      variantCount: variant.total,
      activeVariantCount: variant.active,
      isIncluded: saved?.is_included ?? false,
      priority: saved?.priority ?? "normal",
      adTypes: saved?.ad_types?.length ? saved.ad_types : ["instagram_feed"],
      score: analysis.score,
      issues: analysis.issues,
    } satisfies AdvertisementProduct;
  });
  return {
    data: {
      products,
      settings: settingsResult.data ?? {
        id: true,
        daily_budget: 500,
        target_country: "Türkiye",
        excluded_regions: ["Antalya"],
        updated_at: new Date(0).toISOString(),
        updated_by: null,
      },
    },
    error: null,
  };
}

export async function saveAdvertisementProduct(
  values: Pick<
    AdvertisementProductSettings,
    "product_id" | "is_included" | "priority" | "ad_types"
  >,
): Promise<Result<AdvertisementProductSettings>> {
  const supabase = createClient();
  if (!supabase)
    return { data: null, error: "Supabase bağlantısı bulunamadı." };
  const { data, error } = await supabase
    .from("advertisement_product_settings")
    .upsert(
      { ...values, updated_at: new Date().toISOString() },
      { onConflict: "product_id" },
    )
    .select()
    .single();
  return { data, error: error?.message ?? null };
}

export async function saveAdvertisementCenterSettings(
  values: Pick<
    AdvertisementCenterSettings,
    "daily_budget" | "target_country" | "excluded_regions"
  >,
): Promise<Result<AdvertisementCenterSettings>> {
  const supabase = createClient();
  if (!supabase)
    return { data: null, error: "Supabase bağlantısı bulunamadı." };
  const { data, error } = await supabase
    .from("advertisement_center_settings")
    .upsert(
      { id: true, ...values, updated_at: new Date().toISOString() },
      { onConflict: "id" },
    )
    .select()
    .single();
  return { data, error: error?.message ?? null };
}
