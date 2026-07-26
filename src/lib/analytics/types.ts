import type { Tables } from "@/types/database";
export type DailyMetric = Tables<"analytics_daily_metrics">;
export type ProductMetric = Tables<"analytics_product_metrics">;
export type CustomerMetric = Tables<"analytics_customer_metrics">;
export type DateRange = { start: string; end: string };
export type ProductAnalyticsFilters = {
  query: string;
  brand: string;
  categoryId: string;
  minSales: string;
  sort:
    | "best_selling"
    | "highest_revenue"
    | "most_refunded"
    | "lowest_stock"
    | "least_selling";
};
export type CustomerAnalyticsFilters = {
  query: string;
  segment: string;
  minRevenue: string;
  minOrders: string;
  repeat: "" | "yes" | "no";
};
export type AnalyticsResult<T> = { data: T | null; error: string | null };
export type AnalyticsSummary = {
  grossRevenue: number;
  netRevenue: number;
  discountTotal: number;
  refundTotal: number;
  orderCount: number;
  completedOrders: number;
  cancelledOrders: number;
  averageOrderValue: number;
  itemsSold: number;
  newCustomers: number;
  repeatCustomers: number;
  activeCustomers: number;
  paymentSuccessRate: number;
  cancellationRate: number;
  deliverySuccessRate: number;
  conversionPlaceholder: null;
};
export type DistributionItem = { label: string; value: number };
export type OrderAnalytics = {
  orderStatuses: DistributionItem[];
  paymentStatuses: DistributionItem[];
  fulfillmentStatuses: DistributionItem[];
  paymentMethods: DistributionItem[];
  carriers: DistributionItem[];
};
export type StockAnalytics = {
  physical: number;
  reserved: number;
  available: number;
  outOfStock: number;
  critical: number;
  movementCount: number;
  topOutgoing: DistributionItem[];
  topCorrections: DistributionItem[];
};
