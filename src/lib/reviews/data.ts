import { createPublicClient } from "@/lib/supabase/public";
import type { ProductReview } from "@/types/database";

export async function getApprovedProductReviews(
  productId: string,
): Promise<ProductReview[]> {
  const client = createPublicClient();
  if (!client) return [];
  const result = await client
    .from("product_reviews")
    .select("*")
    .eq("product_id", productId)
    .eq("status", "approved")
    .order("created_at", { ascending: false });
  return result.error ? [] : result.data;
}
