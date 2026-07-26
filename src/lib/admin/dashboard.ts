import { createClient } from "@/lib/supabase/client";

export type DashboardMetrics = {
  core: {
    products: number;
    customers: number;
    orders: number;
    netRevenue: number;
  };
  inventory: {
    total: number;
    reserved: number;
    outOfStock: number;
    critical: number;
  };
  crm: {
    total: number;
    active: number;
    vip: number;
    newCustomers: number;
    blocked: number;
  };
  shipping: {
    ready: number;
    shipped: number;
    transit: number;
    deliveredToday: number;
    failed: number;
  };
  analytics: {
    todayRevenue: number;
    weekRevenue: number;
    todayOrders: number;
    averageOrder: number;
    newCustomersToday: number;
  };
};

const numberValue = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

function metricGroup(value: unknown) {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function mapMetrics(value: unknown): DashboardMetrics {
  const root = metricGroup(value);
  const core = metricGroup(root.core);
  const inventory = metricGroup(root.inventory);
  const crm = metricGroup(root.crm);
  const shipping = metricGroup(root.shipping);
  const analytics = metricGroup(root.analytics);
  return {
    core: {
      products: numberValue(core.products),
      customers: numberValue(core.customers),
      orders: numberValue(core.orders),
      netRevenue: numberValue(core.netRevenue),
    },
    inventory: {
      total: numberValue(inventory.total),
      reserved: numberValue(inventory.reserved),
      outOfStock: numberValue(inventory.outOfStock),
      critical: numberValue(inventory.critical),
    },
    crm: {
      total: numberValue(crm.total),
      active: numberValue(crm.active),
      vip: numberValue(crm.vip),
      newCustomers: numberValue(crm.newCustomers),
      blocked: numberValue(crm.blocked),
    },
    shipping: {
      ready: numberValue(shipping.ready),
      shipped: numberValue(shipping.shipped),
      transit: numberValue(shipping.transit),
      deliveredToday: numberValue(shipping.deliveredToday),
      failed: numberValue(shipping.failed),
    },
    analytics: {
      todayRevenue: numberValue(analytics.todayRevenue),
      weekRevenue: numberValue(analytics.weekRevenue),
      todayOrders: numberValue(analytics.todayOrders),
      averageOrder: numberValue(analytics.averageOrder),
      newCustomersToday: numberValue(analytics.newCustomersToday),
    },
  };
}

export async function getDashboardMetrics() {
  const client = createClient();
  if (!client)
    return { data: null, error: "Supabase bağlantısı yapılandırılmamış." };
  const result = await client.rpc("admin_dashboard_metrics");
  return result.error
    ? { data: null, error: result.error.message }
    : { data: mapMetrics(result.data), error: null };
}
