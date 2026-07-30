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

  const path = `content/${randomUUID()}.webp`;
  try {
    const buffer = await sharp(Buffer.from(await file.arrayBuffer()))
      .rotate()
      .resize({
        width: 1800,
        height: 1800,
        fit: "inside",
        withoutEnlargement: true,
      })
      .flatten({ background: "#ffffff" })
      .webp({ quality: 90, smartSubsample: true })
      .toBuffer();
    const upload = await db.storage
      .from(PRODUCT_IMAGE_BUCKET)
      .upload(path, buffer, {
        cacheControl: "31536000",
        contentType: "image/webp",
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
