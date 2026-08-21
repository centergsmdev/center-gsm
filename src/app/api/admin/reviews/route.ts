import { NextResponse } from "next/server";

import {
  getReviewFiles,
  removeReviewImages,
  uploadReviewImages,
  validateReviewFiles,
} from "@/lib/reviews/server";
import { authApi } from "@/lib/supabase/auth-api";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const response = (data: string | null, error: string | null, status = 200) =>
  NextResponse.json({ data, error }, { status });

export async function POST(request: Request) {
  const db = await createClient();
  if (!db) return response(null, "Yorum sistemi şu anda kullanılamıyor.", 503);
  const {
    data: { user },
  } = await authApi(db).getUser();
  if (user?.app_metadata.role !== "admin")
    return response(null, "Bu işlem için admin yetkisi gerekiyor.", 403);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return response(null, "Yorum verisi okunamadı.", 400);
  }
  const productId = String(form.get("productId") ?? "").trim();
  const authorName = String(form.get("authorName") ?? "").trim();
  const rating = Number(form.get("rating"));
  const title = String(form.get("title") ?? "");
  const body = String(form.get("body") ?? "");
  const status = String(form.get("status") ?? "approved");
  const files = getReviewFiles(form);
  const fileError = validateReviewFiles(files);
  if (fileError) return response(null, fileError, 400);

  let paths: string[] = [];
  try {
    paths = await uploadReviewImages(files, `admins/${user.id}`);
    const result = await db.rpc("admin_create_product_review_with_images", {
      p_product_id: productId,
      p_author_name: authorName,
      p_rating: rating,
      p_title: title,
      p_body: body,
      p_image_paths: paths,
      p_status: status,
    });
    if (result.error) throw result.error;
    return response(result.data, null);
  } catch {
    await removeReviewImages(paths);
    return response(
      null,
      "Yorum oluşturulamadı. Alanları, görselleri ve yetkinizi kontrol edin.",
      422,
    );
  }
}
