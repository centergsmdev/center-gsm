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
  imageFiles: File[];
}): Promise<ReviewResult<string>> {
  const form = new FormData();
  form.set("productId", input.productId);
  form.set("rating", String(input.rating));
  form.set("title", input.title);
  form.set("body", input.body);
  input.imageFiles.forEach((file) => form.append("files", file));
  try {
    const response = await fetch("/api/reviews", {
      method: "POST",
      body: form,
    });
    return (await response.json()) as ReviewResult<string>;
  } catch {
    return { data: null, error: connectionError };
  }
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
  imageFiles: File[];
}): Promise<ReviewResult<string>> {
  const form = new FormData();
  form.set("productId", input.productId);
  form.set("authorName", input.authorName);
  form.set("rating", String(input.rating));
  form.set("title", input.title);
  form.set("body", input.body);
  form.set("status", input.status);
  input.imageFiles.forEach((file) => form.append("files", file));
  try {
    const response = await fetch("/api/admin/reviews", {
      method: "POST",
      body: form,
    });
    return (await response.json()) as ReviewResult<string>;
  } catch {
    return { data: null, error: connectionError };
  }
}

export async function updateAdminReview(
  reviewId: string,
  input: {
    productId: string;
    authorName: string;
    rating: number;
    title: string;
    body: string;
    status: ProductReview["status"];
    imagePaths: string[];
    imageFiles: File[];
  },
): Promise<ReviewResult<true>> {
  const form = new FormData();
  form.set("productId", input.productId);
  form.set("authorName", input.authorName);
  form.set("rating", String(input.rating));
  form.set("title", input.title);
  form.set("body", input.body);
  form.set("status", input.status);
  form.set("imagePaths", JSON.stringify(input.imagePaths));
  input.imageFiles.forEach((file) => form.append("files", file));
  try {
    const response = await fetch(`/api/admin/reviews/${reviewId}`, {
      method: "PATCH",
      body: form,
    });
    return (await response.json()) as ReviewResult<true>;
  } catch {
    return { data: null, error: connectionError };
  }
}

export async function manageAdminReview(
  reviewId: string,
  action: "approve" | "reject" | "reply" | "clear_reply" | "delete",
  reply?: string,
): Promise<ReviewResult<true>> {
  const client = createClient();
  if (!client) return { data: null, error: connectionError };
  if (action === "delete") {
    try {
      const response = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: "DELETE",
      });
      return (await response.json()) as ReviewResult<true>;
    } catch {
      return { data: null, error: connectionError };
    }
  }
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
