import { createServiceClient } from "@/lib/supabase/admin";
import { metaItemId } from "@/lib/meta/item-id";

const SITE_URL = "https://centergsm.com.tr";

function csv(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function plainText(value: string | null) {
  return (value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function GET() {
  const client = createServiceClient();
  if (!client)
    return new Response("Catalog feed is not configured.", { status: 503 });
  const [products, brands, settings, variants, colors, images] =
    await Promise.all([
      client
        .from("products")
        .select("id,name,slug,description,brand_id,price,stock_quantity")
        .eq("is_active", true),
      client.from("brands").select("id,name").eq("is_active", true),
      client
        .from("advertisement_product_settings")
        .select("product_id,is_included")
        .eq("is_included", true),
      client
        .from("product_variants")
        .select(
          "id,product_id,name,price,stock_quantity,color_id,storage_value,storage_unit,is_default,is_active",
        ),
      client.from("product_colors").select("id,name"),
      client
        .from("product_images")
        .select("product_id,color_id,url,is_primary,sort_order")
        .order("sort_order"),
    ]);
  const error =
    products.error ??
    brands.error ??
    settings.error ??
    variants.error ??
    colors.error ??
    images.error;
  if (error)
    return new Response("Catalog feed is temporarily unavailable.", {
      status: 503,
    });

  const included = new Set((settings.data ?? []).map((row) => row.product_id));
  const brandNames = new Map(
    (brands.data ?? []).map((row) => [row.id, row.name]),
  );
  const colorNames = new Map(
    (colors.data ?? []).map((row) => [row.id, row.name]),
  );
  const variantsByProduct = new Map<
    string,
    NonNullable<typeof variants.data>
  >();
  const productsWithVariants = new Set<string>();
  for (const variant of variants.data ?? []) {
    productsWithVariants.add(variant.product_id);
    if (!variant.is_active) continue;
    const list = variantsByProduct.get(variant.product_id) ?? [];
    list.push(variant);
    variantsByProduct.set(variant.product_id, list);
  }
  const primaryImages = new Map<string, string>();
  const colorImages = new Map<string, string>();
  for (const image of images.data ?? []) {
    if (image.color_id) {
      const key = `${image.product_id}:${image.color_id}`;
      if (image.is_primary || !colorImages.has(key))
        colorImages.set(key, image.url);
    }
    if (image.is_primary || !primaryImages.has(image.product_id))
      primaryImages.set(image.product_id, image.url);
  }

  const header = [
    "id",
    "title",
    "description",
    "availability",
    "condition",
    "price",
    "link",
    "image_link",
    "brand",
    "item_group_id",
  ];
  const rows = (products.data ?? []).flatMap((product) => {
    if (!included.has(product.id)) return [];
    const activeVariants = variantsByProduct.get(product.id);
    if (productsWithVariants.has(product.id) && !activeVariants?.length)
      return [];
    const productVariants = activeVariants ?? [undefined];
    return productVariants.flatMap((variant) => {
      const image =
        (variant?.color_id
          ? colorImages.get(`${product.id}:${variant.color_id}`)
          : undefined) ?? primaryImages.get(product.id);
      if (!image) return [];
      const price = variant?.price ?? product.price;
      const stock = variant?.stock_quantity ?? product.stock_quantity;
      if (!(price > 0)) return [];
      const params = new URLSearchParams();
      const color = variant?.color_id
        ? colorNames.get(variant.color_id)
        : undefined;
      if (color) params.set("color", color);
      if (variant?.storage_value && variant.storage_unit)
        params.set(
          "storage",
          `${variant.storage_value}-${variant.storage_unit}`,
        );
      const path = `/urun/${encodeURIComponent(product.slug)}`;
      const link = `${SITE_URL}${path}${params.size ? `?${params}` : ""}`;
      return [
        [
          metaItemId(product.id, variant?.id),
          variant?.name?.trim() || product.name,
          plainText(product.description) || product.name,
          stock > 0 ? "in stock" : "out of stock",
          "new",
          `${Number(price).toFixed(2)} TRY`,
          link,
          image,
          brandNames.get(product.brand_id) ?? "CENTER GSM",
          product.id,
        ]
          .map(csv)
          .join(","),
      ];
    });
  });
  return new Response([header.join(","), ...rows].join("\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "cache-control": "public, max-age=300, s-maxage=300",
      "content-disposition": 'inline; filename="meta-products.csv"',
    },
  });
}
