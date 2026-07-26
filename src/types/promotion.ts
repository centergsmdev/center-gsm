import type { Tables } from "@/types/database";

export type PromotionStatus = "all" | "active" | "inactive";
export type DiscountType = "percentage" | "fixed" | "free_shipping";
export type PromotionFilters = { query: string; status: PromotionStatus };
export type CampaignTargetType = "all" | "category" | "brand" | "product";
export type CampaignFormValues = Omit<
  Tables<"campaigns">,
  "id" | "created_at" | "updated_at"
>;
export type CouponFormValues = Omit<
  Tables<"coupons">,
  "id" | "created_at" | "updated_at" | "title" | "priority" | "is_stackable"
> &
  Partial<Pick<Tables<"coupons">, "title" | "priority" | "is_stackable">>;
