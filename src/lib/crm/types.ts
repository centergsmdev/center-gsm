import type { Json, Tables } from "@/types/database";
import type { CustomerSegment, CustomerStatus } from "./constants";
export type CustomerProfile = Tables<"customer_profiles">;
export type CustomerNote = Tables<"customer_notes">;
export type CustomerTag = Tables<"customer_tags">;
export type CustomerActivity = Tables<"customer_activity">;
export type CustomerListItem = CustomerProfile & { tags: CustomerTag[] };
export type CrmResult<T> = { data: T | null; error: string | null };
export type CrmPage<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};
export type CustomerFilters = {
  query: string;
  segment: string;
  status: string;
  tagId: string;
  minOrders: string;
  minLifetimeValue: string;
  page: number;
  pageSize: number;
};
export type CustomerDetail = {
  profile: CustomerProfile;
  addresses: Tables<"addresses">[];
  orders: Tables<"orders">[];
  payments: Tables<"payment_transactions">[];
  shipments: Tables<"shipments">[];
  notes: CustomerNote[];
  tags: CustomerTag[];
  activity: CustomerActivity[];
  averageOrderValue: number;
};
export type UpdateCustomerInput = {
  customerId: string;
  status: CustomerStatus;
  segment: CustomerSegment;
  marketingOptIn: boolean;
};
export type ActivityInput = {
  customerId: string;
  activityType: string;
  description: string;
  metadata?: Json;
};
