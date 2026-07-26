import { createClient } from "@/lib/supabase/client";
import type { AdminProductResult } from "@/types/admin-product";
import type { Tables } from "@/types/database";

export const PRODUCT_IMAGE_BUCKET = "product-images";
export const MAX_PRODUCT_IMAGE_SIZE = 5 * 1024 * 1024;
export const LARGE_PRODUCT_IMAGE_SIZE = 2 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const SAFE_ERROR =
  "Görsel işlemi tamamlanamadı. Lütfen yetkinizi ve bağlantınızı kontrol edin.";

export type ImageValidation = {
  valid: File[];
  errors: string[];
  warnings: string[];
};
export type UploadProgress = {
  fileName: string;
  progress: number;
  status: "uploading" | "complete" | "error";
};

export function validateProductImages(files: File[]): ImageValidation {
  const valid: File[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  for (const file of files) {
    if (!ACCEPTED_TYPES.has(file.type)) {
      errors.push(`${file.name}: Sadece JPEG, PNG ve WebP kabul edilir.`);
      continue;
    }
    if (file.size > MAX_PRODUCT_IMAGE_SIZE) {
      errors.push(`${file.name}: Dosya boyutu 5 MB sınırını aşıyor.`);
      continue;
    }
    if (file.size > LARGE_PRODUCT_IMAGE_SIZE)
      warnings.push(
        `${file.name}: Büyük görsel; yüklemeden önce sıkıştırmanız önerilir.`,
      );
    valid.push(file);
  }
  return { valid, errors, warnings };
}

function safeExtension(file: File) {
  return file.type === "image/png"
    ? "png"
    : file.type === "image/webp"
      ? "webp"
      : "jpg";
}
function safePath(productId: string, file: File) {
  return `${productId}/${crypto.randomUUID()}.${safeExtension(file)}`;
}

export async function uploadTaxonomyImage(
  folder: "categories" | "brands",
  file: File,
): Promise<AdminProductResult<{ url: string; path: string }>> {
  const validation = validateProductImages([file]);
  if (!validation.valid.length)
    return { data: null, error: validation.errors[0] ?? "Görsel geçersiz." };
  const client = createClient();
  if (!client)
    return { data: null, error: "Supabase bağlantısı yapılandırılmamış." };
  const path = `${folder}/${crypto.randomUUID()}.${safeExtension(file)}`;
  const result = await client.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .upload(path, file, {
      cacheControl: "31536000",
      contentType: file.type,
      upsert: false,
    });
  if (result.error) return { data: null, error: SAFE_ERROR };
  const { data } = client.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .getPublicUrl(path);
  return { data: { url: data.publicUrl, path }, error: null };
}

export async function deleteStorageImageByUrl(url: string | null) {
  if (!url) return;
  const marker = `/${PRODUCT_IMAGE_BUCKET}/`;
  const markerIndex = url.indexOf(marker);
  if (markerIndex < 0) return;
  const path = decodeURIComponent(url.slice(markerIndex + marker.length));
  const client = createClient();
  if (client) await client.storage.from(PRODUCT_IMAGE_BUCKET).remove([path]);
}

export async function uploadProductImages(
  productId: string,
  files: File[],
  startOrder: number,
  onProgress?: (progress: UploadProgress) => void,
): Promise<AdminProductResult<Tables<"product_images">[]>> {
  const client = createClient();
  if (!client)
    return { data: null, error: "Supabase bağlantısı yapılandırılmamış." };
  const uploaded: Tables<"product_images">[] = [];
  for (const [index, file] of files.entries()) {
    const path = safePath(productId, file);
    onProgress?.({ fileName: file.name, progress: 15, status: "uploading" });
    const storageResult = await client.storage
      .from(PRODUCT_IMAGE_BUCKET)
      .upload(path, file, {
        cacheControl: "31536000",
        contentType: file.type,
        upsert: false,
      });
    if (storageResult.error) {
      onProgress?.({ fileName: file.name, progress: 0, status: "error" });
      return { data: null, error: SAFE_ERROR };
    }
    onProgress?.({ fileName: file.name, progress: 70, status: "uploading" });
    const { data: publicUrl } = client.storage
      .from(PRODUCT_IMAGE_BUCKET)
      .getPublicUrl(path);
    const row = await client
      .from("product_images")
      .insert({
        product_id: productId,
        url: publicUrl.publicUrl,
        path,
        alt_text: file.name.replace(/\.[^.]+$/, ""),
        sort_order: startOrder + index,
        is_primary: startOrder + index === 0,
      })
      .select("*")
      .single();
    if (row.error) {
      await client.storage.from(PRODUCT_IMAGE_BUCKET).remove([path]);
      onProgress?.({ fileName: file.name, progress: 0, status: "error" });
      return { data: null, error: SAFE_ERROR };
    }
    uploaded.push(row.data);
    onProgress?.({ fileName: file.name, progress: 100, status: "complete" });
  }
  return { data: uploaded, error: null };
}

export async function deleteProductImage(
  image: Tables<"product_images">,
): Promise<AdminProductResult<true>> {
  const client = createClient();
  if (!client)
    return { data: null, error: "Supabase bağlantısı yapılandırılmamış." };
  if (image.path) {
    const storage = await client.storage
      .from(PRODUCT_IMAGE_BUCKET)
      .remove([image.path]);
    if (storage.error) return { data: null, error: SAFE_ERROR };
  }
  const result = await client
    .from("product_images")
    .delete()
    .eq("id", image.id);
  if (result.error) return { data: null, error: SAFE_ERROR };
  if (image.is_primary) {
    const next = await client
      .from("product_images")
      .select("id")
      .eq("product_id", image.product_id)
      .order("sort_order")
      .limit(1)
      .maybeSingle();
    if (next.data)
      await client
        .from("product_images")
        .update({ is_primary: true })
        .eq("id", next.data.id);
  }
  return { data: true, error: null };
}

export async function setPrimaryProductImage(
  productId: string,
  imageId: string,
): Promise<AdminProductResult<true>> {
  const client = createClient();
  if (!client)
    return { data: null, error: "Supabase bağlantısı yapılandırılmamış." };
  const clear = await client
    .from("product_images")
    .update({ is_primary: false })
    .eq("product_id", productId);
  if (clear.error) return { data: null, error: SAFE_ERROR };
  const result = await client
    .from("product_images")
    .update({ is_primary: true })
    .eq("id", imageId)
    .eq("product_id", productId);
  return result.error
    ? { data: null, error: SAFE_ERROR }
    : { data: true, error: null };
}

export async function reorderProductImages(
  images: Tables<"product_images">[],
): Promise<AdminProductResult<true>> {
  const client = createClient();
  if (!client)
    return { data: null, error: "Supabase bağlantısı yapılandırılmamış." };
  for (const [index, image] of images.entries()) {
    const temporary = await client
      .from("product_images")
      .update({ sort_order: 1000 + index })
      .eq("id", image.id);
    if (temporary.error) return { data: null, error: SAFE_ERROR };
  }
  for (const [index, image] of images.entries()) {
    const result = await client
      .from("product_images")
      .update({ sort_order: index })
      .eq("id", image.id);
    if (result.error) return { data: null, error: SAFE_ERROR };
  }
  return { data: true, error: null };
}
