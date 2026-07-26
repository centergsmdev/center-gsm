import type { CustomerDetail, CustomerProfile } from "./types";
import type { Tables } from "@/types/database";
export function mapCustomerDetail(
  profile: CustomerProfile,
  addresses: Tables<"addresses">[],
  orders: Tables<"orders">[],
  payments: Tables<"payment_transactions">[],
  shipments: Tables<"shipments">[],
  notes: Tables<"customer_notes">[],
  tags: Tables<"customer_tags">[],
  activity: Tables<"customer_activity">[],
): CustomerDetail {
  return {
    profile,
    addresses,
    orders,
    payments,
    shipments,
    notes,
    tags,
    activity,
    averageOrderValue: profile.order_count
      ? profile.lifetime_value / profile.order_count
      : 0,
  };
}
