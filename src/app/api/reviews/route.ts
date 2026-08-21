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
  if (!user)
    return response(
      null,
      "Yorum yapmak için hesabınıza giriş yapmalısınız.",
      401,
    );

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return response(null, "Yorum verisi okunamadı.", 400);
  }
  const productId = String(form.get("productId") ?? "").trim();
  const rating = Number(form.get("rating"));
  const title = String(form.get("title") ?? "");
  const body = String(form.get("body") ?? "");
  const files = getReviewFiles(form);
  const fileError = validateReviewFiles(files);
  if (fileError) return response(null, fileError, 400);
  if (!productId || !Number.isInteger(rating) || rating < 1 || rating > 5)
    return response(null, "Ürün veya puan bilgisi geçersiz.", 400);
  if (body.trim().length < 10 || body.trim().length > 2000)
    return response(null, "Yorum 10–2000 karakter olmalıdır.", 400);

  let paths: string[] = [];
  try {
    paths = await uploadReviewImages(files, `customers/${user.id}`);
    const result = await db.rpc("submit_product_review_with_images", {
      p_product_id: productId,
      p_rating: rating,
      p_title: title,
      p_body: body,
      p_image_paths: paths,
    });
    if (result.error) throw result.error;
    return response(result.data, null);
  } catch (error) {
    await removeReviewImages(paths);
    const message = error instanceof Error ? error.message : "";
    if (message.includes("review_already_exists"))
      return response(null, "Bu ürün için daha önce yorum yaptınız.", 409);
    return response(
      null,
      "Yorum veya görseller yüklenemedi. Lütfen tekrar deneyin.",
      422,
    );
  }
}
