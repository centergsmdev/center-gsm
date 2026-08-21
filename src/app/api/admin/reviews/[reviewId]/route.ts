import { NextResponse } from "next/server";

import { MAX_REVIEW_IMAGES } from "@/lib/reviews/images";
import {
  getReviewFiles,
  removeReviewImages,
  uploadReviewImages,
  validateReviewFiles,
} from "@/lib/reviews/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { authApi } from "@/lib/supabase/auth-api";
import { createClient } from "@/lib/supabase/server";

const errorResponse = (error: string, status: number) =>
  NextResponse.json({ data: null, error }, { status });

async function requireAdmin() {
  const db = await createClient();
  if (!db)
    return {
      db: null,
      error: errorResponse("Yorum sistemi şu anda kullanılamıyor.", 503),
    };
  const {
    data: { user },
  } = await authApi(db).getUser();
  if (user?.app_metadata.role !== "admin")
    return {
      db: null,
      error: errorResponse("Bu işlem için admin yetkisi gerekiyor.", 403),
    };
  return { db, user, error: null };
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ reviewId: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.db) return auth.error;

  const form = await request.formData().catch(() => null);
  if (!form) return errorResponse("Yorum verisi okunamadı.", 400);

  const productId = String(form.get("productId") ?? "").trim();
  const authorName = String(form.get("authorName") ?? "").trim();
  const rating = Number(form.get("rating"));
  const title = String(form.get("title") ?? "").trim();
  const body = String(form.get("body") ?? "").trim();
  const status = String(form.get("status") ?? "");
  const files = getReviewFiles(form);
  let imagePaths: string[];
  try {
    const parsed = JSON.parse(String(form.get("imagePaths") ?? "[]"));
    if (
      !Array.isArray(parsed) ||
      parsed.some((path) => typeof path !== "string")
    )
      throw new Error("invalid image paths");
    imagePaths = [...new Set(parsed)];
  } catch {
    return errorResponse("Yorum görselleri okunamadı.", 400);
  }

  if (!productId) return errorResponse("Ürün seçimi zorunludur.", 400);
  if (authorName.length < 2 || authorName.length > 80)
    return errorResponse("Müşteri adı 2 ile 80 karakter arasında olmalıdır.", 400);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5)
    return errorResponse("Puan 1 ile 5 arasında olmalıdır.", 400);
  if (title.length > 120)
    return errorResponse("Başlık en fazla 120 karakter olabilir.", 400);
  if (body.length < 10 || body.length > 2000)
    return errorResponse("Yorum 10 ile 2000 karakter arasında olmalıdır.", 400);
  if (!["pending", "approved", "rejected"].includes(status))
    return errorResponse("Yorum durumu geçersiz.", 400);
  const fileError = validateReviewFiles(files);
  if (fileError) return errorResponse(fileError, 400);
  if (imagePaths.length + files.length > MAX_REVIEW_IMAGES)
    return errorResponse(
      `Bir yorumda en fazla ${MAX_REVIEW_IMAGES} görsel olabilir.`,
      400,
    );

  const service = createServiceClient();
  if (!service)
    return errorResponse("Yorum sistemi şu anda kullanılamıyor.", 503);

  const { reviewId } = await context.params;
  const current = await service
    .from("product_reviews")
    .select("id,product_id,is_admin_created,image_paths")
    .eq("id", reviewId)
    .maybeSingle();
  if (current.error || !current.data)
    return errorResponse("Yorum bulunamadı.", 404);
  const currentReview = current.data;
  if (!currentReview.is_admin_created)
    return errorResponse(
      "Yalnızca yönetici tarafından oluşturulan yorumlar düzenlenebilir.",
      403,
    );
  if (imagePaths.some((path) => !currentReview.image_paths.includes(path)))
    return errorResponse("Yorum görselleri geçersiz.", 400);

  const product = await service
    .from("products")
    .select("id")
    .eq("id", productId)
    .maybeSingle();
  if (product.error || !product.data)
    return errorResponse("Seçilen ürün bulunamadı.", 400);

  let uploadedPaths: string[] = [];
  try {
    uploadedPaths = await uploadReviewImages(
      files,
      `admins/${auth.user.id}`,
    );
    const updated = await service
      .from("product_reviews")
      .update({
        product_id: productId,
        author_name: authorName,
        rating,
        title: title || null,
        body,
        status: status as "pending" | "approved" | "rejected",
        image_paths: [...imagePaths, ...uploadedPaths],
        updated_at: new Date().toISOString(),
      })
      .eq("id", reviewId)
      .eq("is_admin_created", true)
      .select("id")
      .maybeSingle();
    if (updated.error || !updated.data) {
      await removeReviewImages(uploadedPaths);
      return errorResponse("Yorum güncellenemedi.", 422);
    }
  } catch {
    await removeReviewImages(uploadedPaths);
    return errorResponse("Yorum görselleri yüklenemedi.", 422);
  }

  await removeReviewImages(
    currentReview.image_paths.filter((path) => !imagePaths.includes(path)),
  );

  return NextResponse.json({
    data: true,
    error: null,
    productId,
    previousProductId: currentReview.product_id,
  });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ reviewId: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.db) return auth.error;
  const db = auth.db;

  const { reviewId } = await context.params;
  const review = await db
    .from("product_reviews")
    .select("image_paths")
    .eq("id", reviewId)
    .maybeSingle();
  if (review.error || !review.data)
    return NextResponse.json(
      { data: null, error: "Yorum bulunamadı." },
      { status: 404 },
    );
  const deleted = await db.rpc("admin_manage_product_review", {
    p_review_id: reviewId,
    p_action: "delete",
    p_reply: null,
  });
  if (deleted.error || !deleted.data)
    return NextResponse.json(
      { data: null, error: "Yorum silinemedi." },
      { status: 422 },
    );
  await removeReviewImages(review.data.image_paths);
  return NextResponse.json({ data: true, error: null });
}
