import type { CustomerSegment, CustomerStatus } from "./constants";
export function calculateSegment(
  status: CustomerStatus,
  lifetimeValue: number,
  orderCount: number,
  lastOrderAt: string | null,
): CustomerSegment {
  if (status === "blocked") return "blocked";
  if (lifetimeValue >= 50000 || orderCount >= 8) return "vip";
  if (orderCount === 0 && !lastOrderAt) return "new";
  if (
    !lastOrderAt ||
    new Date(lastOrderAt).getTime() < Date.now() - 180 * 86400000
  )
    return "inactive";
  return "active";
}
export function calculateLifetimeValue(
  orders: { status: string; grand_total: number }[],
) {
  return orders
    .filter((order) => order.status === "delivered")
    .reduce((total, order) => total + order.grand_total, 0);
}
export function formatCrmCurrency(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(value);
}
export function formatCrmDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("tr-TR", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "—";
}
