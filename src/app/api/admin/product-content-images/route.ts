import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import sharp from "sharp";

import {
  MAX_PRODUCT_IMAGE_SIZE,
  PRODUCT_IMAGE_BUCKET,
} from "@/lib/admin/product-images";
import { authApi } from "@/lib/supabase/auth-api";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const IMAGE_FORMATS = {
  "image/jpeg": { extension: "jpg", sharpFormat: "jpeg" },
  "image/png": { extension: "png", sharpFormat: "png" },
  "image/webp": { extension: "webp", sharpFormat: "webp" },
} as const;
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

  let file: File | null = null;
  try {
    const formData = await request.formData();
    const entry = formData.get("file");
    file = entry instanceof File ? entry : null;
  } catch {
    return errorResponse("Yükleme verisi okunamadı.", 400);
  }
  if (!file || !ACCEPTED_TYPES.has(file.type))
    return errorResponse(
      "Sadece JPEG, PNG ve WebP görseller kabul edilir.",
      400,
    );
  if (file.size > MAX_PRODUCT_IMAGE_SIZE)
    return errorResponse("Görsel 5 MB sınırını aşıyor.", 400);

  const imageFormat = IMAGE_FORMATS[file.type as keyof typeof IMAGE_FORMATS];
  const path = `content/${randomUUID()}.${imageFormat.extension}`;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const metadata = await sharp(buffer).metadata();
    if (
      metadata.format !== imageFormat.sharpFormat ||
      !metadata.width ||
      !metadata.height
    )
      return errorResponse("Görsel dosyası geçerli değil.", 400);

    const upload = await db.storage
      .from(PRODUCT_IMAGE_BUCKET)
      .upload(path, buffer, {
        cacheControl: "31536000",
        contentType: file.type,
        upsert: false,
      });
    if (upload.error) throw upload.error;
    const { data } = db.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path);
    return NextResponse.json({ data: { url: data.publicUrl }, error: null });
  } catch (error) {
    if (process.env.NODE_ENV === "development")
      console.error("Product content image upload failed", error);
    return errorResponse("Açıklama görseli işlenemedi veya yüklenemedi.", 422);
  }
}
