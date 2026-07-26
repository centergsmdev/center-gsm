export const ANALYTICS_MAX_DAYS = 366;
export const ANALYTICS_PAGE_SIZE = 25;
export const ANALYTICS_EXPORT_LIMIT = 5000;
export const ANALYTICS_SAFE_ERROR = "Analitik veriler alınamadı.";
export const ANALYTICS_METRICS = [
  "gross_revenue",
  "net_revenue",
  "discount_total",
  "refund_total",
  "order_count",
  "completed_order_count",
  "cancelled_order_count",
  "average_order_value",
  "items_sold",
  "new_customers",
  "repeat_customers",
  "active_customers",
  "conversion_placeholder",
  "payment_success_rate",
  "cancellation_rate",
  "delivery_success_rate",
  "stock_turnover_placeholder",
] as const;
export type AnalyticsMetric = (typeof ANALYTICS_METRICS)[number];
