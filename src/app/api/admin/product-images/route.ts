import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import {
  MAX_PRODUCT_IMAGE_SIZE,
  PRODUCT_IMAGE_BUCKET,
} from "@/lib/admin/product-images";
import {
  DEFAULT_PRODUCT_IMAGE_TRANSFORM,
  type ProductImageTransform,
} from "@/lib/images/product-image-transform";
import { processProductImage } from "@/lib/images/product-image-pipeline";
import { authApi } from "@/lib/supabase/auth-api";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export const runtime = "nodejs";

const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILES_PER_REQUEST = 8;

type UploadedImage = Tables<"product_images">;

const errorResponse = (message: string, status: number) =>
  NextResponse.json({ data: null, error: message }, { status });

export async function POST(request: Request) {
  const db = await createClient();
  if (!db) return errorResponse("Supabase bağlantısı yapılandırılmamış.", 503);

  const {
    data: { user },
  } = await authApi(db).getUser();
  if (user?.app_metadata.role !== "admin")
    return errorResponse("Bu işlem için admin yetkisi gerekiyor.", 403);

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return errorResponse("Yükleme verisi okunamadı.", 400);
  }

  const productId = formData.get("productId");
  const colorIdValue = formData.get("colorId");
  const colorId =
    typeof colorIdValue === "string" && colorIdValue ? colorIdValue : null;
  const files = formData
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File);
  const transforms = parseTransforms(formData.get("transforms"), files.length);
  if (typeof productId !== "string" || !productId)
    return errorResponse("Ürün bilgisi eksik.", 400);
  if (!files.length || files.length > MAX_FILES_PER_REQUEST)
    return errorResponse(
      "Tek seferde 1–8 ürün görseli yükleyebilirsiniz.",
      400,
    );

  for (const file of files) {
    if (!ACCEPTED_TYPES.has(file.type))
      return errorResponse(
        `${file.name}: Sadece JPEG, PNG ve WebP kabul edilir.`,
        400,
      );
    if (file.size > MAX_PRODUCT_IMAGE_SIZE)
      return errorResponse(
        `${file.name}: Dosya boyutu 5 MB sınırını aşıyor.`,
        400,
      );
  }

  let existingQuery = db
    .from("product_images")
    .select("sort_order,is_primary")
    .eq("product_id", productId);
  existingQuery = colorId
    ? existingQuery.eq("color_id", colorId)
    : existingQuery.is("color_id", null);
  const existing = await existingQuery.order("sort_order", {
    ascending: false,
  });
  if (existing.error)
    return errorResponse("Ürün görselleri doğrulanamadı.", 400);
  const product = await db
    .from("products")
    .select("slug")
    .eq("id", productId)
    .maybeSingle();
  if (product.error || !product.data)
    return errorResponse("Ürün bilgisi doğrulanamadı.", 400);

  const startOrder = existing.data.length ? existing.data[0].sort_order + 1 : 0;
  const hasPrimary = existing.data.some((image) => image.is_primary);
  const uploadedPaths: string[] = [];
  const insertedIds: string[] = [];

  try {
    const rows: UploadedImage[] = [];
    for (const [index, file] of files.entries()) {
      const processed = await processProductImage(
        Buffer.from(await file.arrayBuffer()),
        transforms[index],
      );
      const path = `${productId}/${randomUUID()}.webp`;
      const storage = await db.storage
        .from(PRODUCT_IMAGE_BUCKET)
        .upload(path, processed.buffer, {
          cacheControl: "31536000",
          contentType: "image/webp",
          upsert: false,
        });
      if (storage.error) throw storage.error;
      uploadedPaths.push(path);

      const { data: publicUrl } = db.storage
        .from(PRODUCT_IMAGE_BUCKET)
        .getPublicUrl(path);
      const inserted = await db
        .from("product_images")
        .insert({
          product_id: productId,
          color_id: colorId,
          url: publicUrl.publicUrl,
          path,
          alt_text: file.name.replace(/\.[^.]+$/, ""),
          sort_order: startOrder + index,
          is_primary: !hasPrimary && index === 0,
        })
        .select("*")
        .single();
      if (inserted.error) throw inserted.error;
      insertedIds.push(inserted.data.id);
      rows.push(inserted.data);
    }
    revalidatePath(`/urun/${product.data.slug}`);
    revalidatePath("/");
    revalidatePath("/urunler");
    return NextResponse.json({ data: rows, error: null });
  } catch {
    if (insertedIds.length)
      await db.from("product_images").delete().in("id", insertedIds);
    if (uploadedPaths.length)
      await db.storage.from(PRODUCT_IMAGE_BUCKET).remove(uploadedPaths);
    return errorResponse(
      "Görsel dönüştürülemedi veya yüklenemedi. Orijinal dosyanız değiştirilmedi; lütfen tekrar deneyin.",
      422,
    );
  }
}

function parseTransforms(value: FormDataEntryValue | null, count: number) {
  if (typeof value !== "string")
    return Array.from({ length: count }, () => DEFAULT_PRODUCT_IMAGE_TRANSFORM);
  try {
    const parsed = JSON.parse(value) as Array<Partial<ProductImageTransform>>;
    return Array.from({ length: count }, (_, index) => ({
      zoom: finiteNumber(
        parsed[index]?.zoom,
        DEFAULT_PRODUCT_IMAGE_TRANSFORM.zoom,
      ),
      offsetX: finiteNumber(
        parsed[index]?.offsetX,
        DEFAULT_PRODUCT_IMAGE_TRANSFORM.offsetX,
      ),
      offsetY: finiteNumber(
        parsed[index]?.offsetY,
        DEFAULT_PRODUCT_IMAGE_TRANSFORM.offsetY,
      ),
    }));
  } catch {
    return Array.from({ length: count }, () => DEFAULT_PRODUCT_IMAGE_TRANSFORM);
  }
}

function finiteNumber(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}
