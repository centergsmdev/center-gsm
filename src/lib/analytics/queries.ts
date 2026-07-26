export const ANALYTICS_SORTS = {
  best_selling: ["units_sold", false],
  highest_revenue: ["net_revenue", false],
  most_refunded: ["refund_quantity", false],
  least_selling: ["units_sold", true],
} as const;
