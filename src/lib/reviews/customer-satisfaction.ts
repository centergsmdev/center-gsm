import "server-only";

import {
  CUSTOMER_SATISFACTION_PAGE_SIZE,
  customerSatisfactionPageCount,
  type CustomerSatisfactionQuery,
} from "@/lib/reviews/customer-satisfaction-core";
import { createServiceClient } from "@/lib/supabase/admin";
import type {
  CustomerSatisfactionReview,
  CustomerSatisfactionReviewSummary,
} from "@/types/database";

const emptySummary: CustomerSatisfactionReviewSummary = {
  total_count: 0,
  average_rating: 0,
  rating_1_count: 0,
  rating_2_count: 0,
  rating_3_count: 0,
  rating_4_count: 0,
  rating_5_count: 0,
  photo_count: 0,
  verified_count: 0,
};

function safeProductSearch(value: string) {
  return value.replace(/[%_,]/g, " ").replace(/\s+/g, " ").trim();
}

export async function getCustomerSatisfactionPageData(
  query: CustomerSatisfactionQuery,
) {
  const service = createServiceClient();
  if (!service)
    return {
      reviews: [] as CustomerSatisfactionReview[],
      featured: [] as CustomerSatisfactionReview[],
      summary: emptySummary,
      page: 1,
      pageCount: 1,
      filteredCount: 0,
      unavailable: true,
    };

  const summaryRequest = service
    .from("customer_satisfaction_review_summary")
    .select("*")
    .maybeSingle();
  const featuredRequest = service
    .from("customer_satisfaction_reviews")
    .select("*")
    .eq("is_featured", true)
    .order("created_at", { ascending: false })
    .limit(6);

  let reviewsRequest = service
    .from("customer_satisfaction_reviews")
    .select("*", { count: "exact" });
  if (query.rating) reviewsRequest = reviewsRequest.eq("rating", query.rating);
  if (query.filter === "photos")
    reviewsRequest = reviewsRequest.not("image_paths", "eq", "{}");
  if (query.filter === "verified")
    reviewsRequest = reviewsRequest.eq("verified_purchase", true);
  const productSearch = safeProductSearch(query.search);
  if (productSearch)
    reviewsRequest = reviewsRequest.ilike("product_name", `%${productSearch}%`);

  if (query.sort === "highest") {
    reviewsRequest = reviewsRequest
      .order("rating", { ascending: false })
      .order("created_at", { ascending: false });
  } else if (query.sort === "lowest") {
    reviewsRequest = reviewsRequest
      .order("rating", { ascending: true })
      .order("created_at", { ascending: false });
  } else {
    reviewsRequest = reviewsRequest.order("created_at", { ascending: false });
  }

  const start = (query.page - 1) * CUSTOMER_SATISFACTION_PAGE_SIZE;
  reviewsRequest = reviewsRequest.range(
    start,
    start + CUSTOMER_SATISFACTION_PAGE_SIZE - 1,
  );

  const [summaryResult, featuredResult, reviewsResult] = await Promise.all([
    summaryRequest,
    featuredRequest,
    reviewsRequest,
  ]);
  const filteredCount = reviewsResult.count ?? 0;
  const pageCount = Math.min(100, customerSatisfactionPageCount(filteredCount));

  return {
    reviews: reviewsResult.data ?? [],
    featured: featuredResult.data ?? [],
    summary: summaryResult.data ?? emptySummary,
    page: Math.min(query.page, pageCount),
    pageCount,
    filteredCount,
    unavailable: Boolean(
      summaryResult.error || featuredResult.error || reviewsResult.error,
    ),
  };
}
