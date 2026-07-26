import { createClient } from "@/lib/supabase/client";
import { ANALYTICS_PAGE_SIZE, ANALYTICS_SAFE_ERROR } from "./constants";
import { aggregateDistribution, validateDateRange } from "./helpers";
import { calculateSummary } from "./metrics";
import type {
  AnalyticsResult,
  AnalyticsSummary,
  CustomerMetric,
  DailyMetric,
  DateRange,
  OrderAnalytics,
  ProductMetric,
  ProductAnalyticsFilters,
  CustomerAnalyticsFilters,
  StockAnalytics,
} from "./types";
const unavailable = <T>(): AnalyticsResult<T> => ({
  data: null,
  error: ANALYTICS_SAFE_ERROR,
});
export async function getAnalyticsOverview(
  range: DateRange,
): Promise<
  AnalyticsResult<{ rows: DailyMetric[]; summary: AnalyticsSummary }>
> {
  const db = createClient();
  if (!db || !validateDateRange(range))
    return unavailable<{
      rows: import("./types").DailyMetric[];
      summary: import("./types").AnalyticsSummary;
    }>();
  const result = await db
    .from("analytics_daily_metrics")
    .select("*")
    .gte("metric_date", range.start)
    .lte("metric_date", range.end)
    .order("metric_date");
  return result.error
    ? unavailable()
    : {
        data: { rows: result.data, summary: calculateSummary(result.data) },
        error: null,
      };
}
export async function getProductAnalytics(
  range: DateRange,
  page = 1,
  filters: ProductAnalyticsFilters = {
    query: "",
    brand: "",
    categoryId: "",
    minSales: "",
    sort: "highest_revenue",
  },
): Promise<
  AnalyticsResult<{
    items: (ProductMetric & { availableStock: number })[];
    total: number;
  }>
> {
  const db = createClient();
  if (!db || !validateDateRange(range))
    return unavailable<{
      items: (ProductMetric & { availableStock: number })[];
      total: number;
    }>();
  const from = (page - 1) * ANALYTICS_PAGE_SIZE;
  let query = db
    .from("analytics_product_metrics")
    .select("*", { count: "exact" })
    .gte("metric_date", range.start)
    .lte("metric_date", range.end);
  const term = filters.query.trim().replace(/[,%()]/g, " ");
  if (term)
    query = query.or(`product_name.ilike.%${term}%,sku.ilike.%${term}%`);
  if (filters.brand) query = query.eq("brand_name", filters.brand);
  if (filters.minSales)
    query = query.gte("units_sold", Number(filters.minSales));
  if (filters.categoryId) {
    const products = await db
      .from("products")
      .select("id")
      .eq("category_id", filters.categoryId);
    if (products.error) return unavailable();
    const ids = products.data.map((item) => item.id);
    if (!ids.length) return { data: { items: [], total: 0 }, error: null };
    query = query.in("product_id", ids);
  }
  const sort =
    filters.sort === "best_selling"
      ? (["units_sold", false] as const)
      : filters.sort === "most_refunded"
        ? (["refund_quantity", false] as const)
        : filters.sort === "least_selling"
          ? (["units_sold", true] as const)
          : (["net_revenue", false] as const);
  const rows = await query
    .order(sort[0], { ascending: sort[1] })
    .range(from, from + ANALYTICS_PAGE_SIZE - 1);
  if (rows.error) return unavailable();
  const ids = rows.data.flatMap((row) =>
    row.product_id ? [row.product_id] : [],
  );
  const stocks = ids.length
    ? await db.from("product_available_stock").select("*").in("product_id", ids)
    : { data: [], error: null };
  if (stocks.error) return unavailable();
  return {
    data: {
      items: rows.data.map((row) => ({
        ...row,
        availableStock:
          stocks.data.find((stock) => stock.product_id === row.product_id)
            ?.available_stock ?? 0,
      })),
      total: rows.count ?? 0,
    },
    error: null,
  };
}
export async function getCustomerAnalytics(
  range: DateRange,
  page = 1,
  filters: CustomerAnalyticsFilters = {
    query: "",
    segment: "",
    minRevenue: "",
    minOrders: "",
    repeat: "",
  },
): Promise<
  AnalyticsResult<{
    items: (CustomerMetric & { name: string; segment: string })[];
    total: number;
  }>
> {
  const db = createClient();
  if (!db || !validateDateRange(range))
    return unavailable<{
      items: (CustomerMetric & { name: string; segment: string })[];
      total: number;
    }>();
  const from = (page - 1) * ANALYTICS_PAGE_SIZE;
  let query = db
    .from("analytics_customer_metrics")
    .select("*", { count: "exact" })
    .gte("metric_date", range.start)
    .lte("metric_date", range.end);
  if (filters.minRevenue)
    query = query.gte("revenue", Number(filters.minRevenue));
  if (filters.minOrders)
    query = query.gte("order_count", Number(filters.minOrders));
  if (filters.repeat)
    query = query.eq("is_repeat_customer", filters.repeat === "yes");
  if (filters.query || filters.segment) {
    let profilesQuery = db.from("customer_profiles").select("id");
    const term = filters.query.trim().replace(/[,%()]/g, " ");
    if (term)
      profilesQuery = profilesQuery.or(
        `full_name.ilike.%${term}%,email.ilike.%${term}%`,
      );
    if (filters.segment)
      profilesQuery = profilesQuery.eq(
        "segment",
        filters.segment as "new" | "active" | "vip" | "inactive" | "blocked",
      );
    const matches = await profilesQuery;
    if (matches.error) return unavailable();
    const ids = matches.data.map((item) => item.id);
    if (!ids.length) return { data: { items: [], total: 0 }, error: null };
    query = query.in("customer_id", ids);
  }
  const rows = await query
    .order("revenue", { ascending: false })
    .range(from, from + ANALYTICS_PAGE_SIZE - 1);
  if (rows.error) return unavailable();
  const ids = rows.data.flatMap((row) =>
    row.customer_id ? [row.customer_id] : [],
  );
  const profiles = ids.length
    ? await db.from("customer_profiles").select("*").in("id", ids)
    : { data: [], error: null };
  if (profiles.error) return unavailable();
  return {
    data: {
      items: rows.data.map((row) => {
        const profile = profiles.data.find(
          (item) => item.id === row.customer_id,
        );
        return {
          ...row,
          name: profile?.full_name ?? "Misafir müşteri",
          segment: profile?.segment ?? "guest",
        };
      }),
      total: rows.count ?? 0,
    },
    error: null,
  };
}
export async function getAnalyticsReferences() {
  const db = createClient();
  if (!db) return { brands: [], categories: [] };
  const [brands, categories] = await Promise.all([
    db.from("brands").select("name").order("name"),
    db.from("categories").select("id,name").order("name"),
  ]);
  return { brands: brands.data ?? [], categories: categories.data ?? [] };
}
export async function getOrderAnalytics(
  range: DateRange,
): Promise<AnalyticsResult<OrderAnalytics>> {
  const db = createClient();
  if (!db || !validateDateRange(range)) return unavailable();
  const start = `${range.start}T00:00:00Z`,
    end = `${range.end}T23:59:59Z`;
  const [orders, shipments, carriers] = await Promise.all([
    db
      .from("orders")
      .select("status,payment_status,fulfillment_status,payment_method")
      .gte("created_at", start)
      .lte("created_at", end)
      .limit(5000),
    db
      .from("shipments")
      .select("carrier_id")
      .gte("created_at", start)
      .lte("created_at", end)
      .limit(5000),
    db.from("shipping_carriers").select("id,name"),
  ]);
  if (orders.error || shipments.error || carriers.error) return unavailable();
  return {
    data: {
      orderStatuses: aggregateDistribution(
        orders.data.map((row) => row.status),
      ),
      paymentStatuses: aggregateDistribution(
        orders.data.map((row) => row.payment_status),
      ),
      fulfillmentStatuses: aggregateDistribution(
        orders.data.map((row) => row.fulfillment_status),
      ),
      paymentMethods: aggregateDistribution(
        orders.data.map((row) => row.payment_method),
      ),
      carriers: aggregateDistribution(
        shipments.data.map(
          (row) =>
            carriers.data.find((carrier) => carrier.id === row.carrier_id)
              ?.name ?? "Bilinmiyor",
        ),
      ),
    },
    error: null,
  };
}
export async function getStockAnalytics(): Promise<
  AnalyticsResult<StockAnalytics>
> {
  const db = createClient();
  if (!db) return unavailable();
  const [inventory, movements, products] = await Promise.all([
    db.from("inventory").select("*"),
    db
      .from("inventory_movements")
      .select("*")
      .gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString())
      .limit(5000),
    db.from("products").select("id,name"),
  ]);
  if (inventory.error || movements.error || products.error)
    return unavailable();
  const physical = inventory.data.reduce(
      (sum, row) => sum + row.quantity_on_hand,
      0,
    ),
    reserved = inventory.data.reduce(
      (sum, row) => sum + row.quantity_reserved,
      0,
    );
  const outgoing = movements.data
    .filter((row) => row.quantity < 0)
    .map(
      (row) =>
        products.data.find((product) => product.id === row.product_id)?.name ??
        row.product_id,
    );
  const corrections = movements.data
    .filter((row) => row.movement_type === "stock_correction")
    .map(
      (row) =>
        products.data.find((product) => product.id === row.product_id)?.name ??
        row.product_id,
    );
  return {
    data: {
      physical,
      reserved,
      available: physical - reserved,
      outOfStock: inventory.data.filter(
        (row) => row.quantity_on_hand - row.quantity_reserved <= 0,
      ).length,
      critical: inventory.data.filter(
        (row) =>
          row.quantity_on_hand - row.quantity_reserved <= row.reorder_level,
      ).length,
      movementCount: movements.data.length,
      topOutgoing: aggregateDistribution(outgoing).slice(0, 10),
      topCorrections: aggregateDistribution(corrections).slice(0, 10),
    },
    error: null,
  };
}
