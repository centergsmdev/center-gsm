import type { AnalyticsSummary, DailyMetric } from "./types";
export function calculateSummary(rows: DailyMetric[]): AnalyticsSummary {
  const sum = (key: keyof DailyMetric) =>
    rows.reduce((total, row) => total + Number(row[key] ?? 0), 0);
  const orderCount = sum("order_count"),
    completed = sum("completed_order_count"),
    cancelled = sum("cancelled_order_count");
  return {
    grossRevenue: sum("gross_revenue"),
    netRevenue: sum("net_revenue"),
    discountTotal: sum("discount_total"),
    refundTotal: sum("refund_total"),
    orderCount,
    completedOrders: completed,
    cancelledOrders: cancelled,
    averageOrderValue: orderCount ? sum("gross_revenue") / orderCount : 0,
    itemsSold: sum("items_sold"),
    newCustomers: sum("new_customer_count"),
    repeatCustomers: 0,
    activeCustomers: Math.max(...rows.map((row) => row.customer_count), 0),
    paymentSuccessRate: orderCount ? (completed / orderCount) * 100 : 0,
    cancellationRate: orderCount ? (cancelled / orderCount) * 100 : 0,
    deliverySuccessRate: orderCount ? (completed / orderCount) * 100 : 0,
    conversionPlaceholder: null,
  };
}
