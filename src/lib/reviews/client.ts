import { createClient } from "@/lib/supabase/client";
import type { ProductReview, Tables } from "@/types/database";

export type ReviewResult<T> = { data: T | null; error: string | null };

const connectionError =
  "Yorum sistemi şu anda kullanılamıyor. Lütfen tekrar deneyin.";

export async function revalidateProductReviews(productId: string) {
  await fetch(
    `/api/admin/reviews/revalidate?productId=${encodeURIComponent(productId)}`,
    { method: "POST" },
  );
}

export async function submitProductReview(input: {
  productId: string;
  rating: number;
  title: string;
  body: string;
}): Promise<ReviewResult<string>> {
  const client = createClient();
  if (!client) return { data: null, error: connectionError };
  const { data: userData } = await client.auth.getUser();
  if (!userData.user)
    return {
      data: null,
      error: "Yorum yapmak için hesabınıza giriş yapmalısınız.",
    };
  const result = await client.rpc("submit_product_review", {
    p_product_id: input.productId,
    p_rating: input.rating,
    p_title: input.title,
    p_body: input.body,
  });
  if (!result.error) return { data: result.data, error: null };
  const message = result.error.message;
  if (message.includes("review_already_exists"))
    return { data: null, error: "Bu ürün için daha önce yorum yaptınız." };
  if (message.includes("authentication_required"))
    return {
      data: null,
      error: "Yorum yapmak için hesabınıza giriş yapmalısınız.",
    };
  return { data: null, error: connectionError };
}

export async function getAdminReviews(): Promise<
  ReviewResult<ProductReview[]>
> {
  const client = createClient();
  if (!client) return { data: null, error: connectionError };
  const result = await client
    .from("product_reviews")
    .select("*")
    .order("created_at", { ascending: false });
  return result.error
    ? { data: null, error: connectionError }
    : { data: result.data, error: null };
}

export async function getReviewProducts(): Promise<
  ReviewResult<Pick<Tables<"products">, "id" | "name" | "slug">[]>
> {
  const client = createClient();
  if (!client) return { data: null, error: connectionError };
  const result = await client
    .from("products")
    .select("id,name,slug")
    .eq("is_active", true)
    .order("name");
  return result.error
    ? { data: null, error: connectionError }
    : { data: result.data, error: null };
}

export async function createAdminReview(input: {
  productId: string;
  authorName: string;
  rating: number;
  title: string;
  body: string;
  status: ProductReview["status"];
}): Promise<ReviewResult<string>> {
  const client = createClient();
  if (!client) return { data: null, error: connectionError };
  const result = await client.rpc("admin_create_product_review", {
    p_product_id: input.productId,
    p_author_name: input.authorName,
    p_rating: input.rating,
    p_title: input.title,
    p_body: input.body,
    p_status: input.status,
  });
  return result.error
    ? {
        data: null,
        error: "Yorum oluşturulamadı. Alanları ve yetkinizi kontrol edin.",
      }
    : { data: result.data, error: null };
}

export async function manageAdminReview(
  reviewId: string,
  action: "approve" | "reject" | "reply" | "clear_reply" | "delete",
  reply?: string,
): Promise<ReviewResult<true>> {
  const client = createClient();
  if (!client) return { data: null, error: connectionError };
  const result = await client.rpc("admin_manage_product_review", {
    p_review_id: reviewId,
    p_action: action,
    p_reply: reply ?? null,
  });
  return result.error || !result.data
    ? {
        data: null,
        error: "Yorum işlemi tamamlanamadı. Yetkinizi kontrol edin.",
      }
    : { data: true, error: null };
}
