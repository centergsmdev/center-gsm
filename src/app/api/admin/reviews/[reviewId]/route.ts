import { NextResponse } from "next/server";

import { removeReviewImages } from "@/lib/reviews/server";
import { authApi } from "@/lib/supabase/auth-api";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ reviewId: string }> },
) {
  const db = await createClient();
  if (!db)
    return NextResponse.json(
      { data: null, error: "Yorum sistemi şu anda kullanılamıyor." },
      { status: 503 },
    );
  const {
    data: { user },
  } = await authApi(db).getUser();
  if (user?.app_metadata.role !== "admin")
    return NextResponse.json(
      { data: null, error: "Bu işlem için admin yetkisi gerekiyor." },
      { status: 403 },
    );

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
