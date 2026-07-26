import { createClient } from "@/lib/supabase/client";
import { CRM_NOT_CONFIGURED, CRM_SAFE_ERROR } from "./constants";
import { mapCustomerDetail } from "./mapper";
import type {
  CrmPage,
  CrmResult,
  CustomerDetail,
  CustomerFilters,
  CustomerListItem,
} from "./types";
const safe = (value: string) => value.trim().replace(/[,%()]/g, " ");
export async function getCustomers(
  filters: CustomerFilters,
): Promise<CrmResult<CrmPage<CustomerListItem>>> {
  const db = createClient();
  if (!db) return { data: null, error: CRM_NOT_CONFIGURED };
  const from = (filters.page - 1) * filters.pageSize;
  let query = db.from("customer_profiles").select("*", { count: "exact" });
  if (filters.tagId) {
    const tagged = await db
      .from("customer_tag_relations")
      .select("customer_id")
      .eq("tag_id", filters.tagId);
    if (tagged.error) return { data: null, error: CRM_SAFE_ERROR };
    const customerIds = tagged.data.map((item) => item.customer_id);
    if (!customerIds.length)
      return {
        data: {
          items: [],
          total: 0,
          page: filters.page,
          pageSize: filters.pageSize,
        },
        error: null,
      };
    query = query.in("id", customerIds);
  }
  if (safe(filters.query))
    query = query.or(
      `full_name.ilike.%${safe(filters.query)}%,email.ilike.%${safe(filters.query)}%,phone.ilike.%${safe(filters.query)}%`,
    );
  if (filters.segment)
    query = query.eq("segment", filters.segment as CustomerListItem["segment"]);
  if (filters.status)
    query = query.eq("status", filters.status as CustomerListItem["status"]);
  if (filters.minOrders)
    query = query.gte("order_count", Number(filters.minOrders));
  if (filters.minLifetimeValue)
    query = query.gte("lifetime_value", Number(filters.minLifetimeValue));
  const profiles = await query
    .order("created_at", { ascending: false })
    .range(from, from + filters.pageSize - 1);
  if (profiles.error) return { data: null, error: CRM_SAFE_ERROR };
  const ids = profiles.data.map((item) => item.id);
  const relations = ids.length
    ? await db.from("customer_tag_relations").select("*").in("customer_id", ids)
    : { data: [], error: null };
  const tagIds = [
    ...new Set((relations.data ?? []).map((item) => item.tag_id)),
  ];
  const tags = tagIds.length
    ? await db.from("customer_tags").select("*").in("id", tagIds)
    : { data: [], error: null };
  if (relations.error || tags.error)
    return { data: null, error: CRM_SAFE_ERROR };
  const items = profiles.data.map((profile) => ({
    ...profile,
    tags: (relations.data ?? [])
      .filter((relation) => relation.customer_id === profile.id)
      .flatMap((relation) =>
        (tags.data ?? []).filter((tag) => tag.id === relation.tag_id),
      ),
  }));
  return {
    data: {
      items,
      total: profiles.count ?? 0,
      page: filters.page,
      pageSize: filters.pageSize,
    },
    error: null,
  };
}
export async function getCustomerProfile(
  id: string,
): Promise<CrmResult<CustomerDetail>> {
  const db = createClient();
  if (!db) return { data: null, error: CRM_NOT_CONFIGURED };
  const profile = await db
    .from("customer_profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (profile.error || !profile.data)
    return { data: null, error: profile.error ? CRM_SAFE_ERROR : null };
  const [addresses, orders, notes, activity, relations] = await Promise.all([
    db
      .from("addresses")
      .select("*")
      .eq("user_id", profile.data.user_id)
      .order("is_default", { ascending: false }),
    db
      .from("orders")
      .select("*")
      .eq("user_id", profile.data.user_id)
      .order("created_at", { ascending: false }),
    db
      .from("customer_notes")
      .select("*")
      .eq("customer_id", id)
      .order("created_at", { ascending: false }),
    db
      .from("customer_activity")
      .select("*")
      .eq("customer_id", id)
      .order("created_at", { ascending: false }),
    db.from("customer_tag_relations").select("*").eq("customer_id", id),
  ]);
  if (
    addresses.error ||
    orders.error ||
    notes.error ||
    activity.error ||
    relations.error
  )
    return { data: null, error: CRM_SAFE_ERROR };
  const orderIds = orders.data.map((item) => item.id);
  const tagIds = relations.data.map((item) => item.tag_id);
  const [payments, shipments, tags] = await Promise.all([
    orderIds.length
      ? db
          .from("payment_transactions")
          .select("*")
          .in("order_id", orderIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    orderIds.length
      ? db
          .from("shipments")
          .select("*")
          .in("order_id", orderIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    tagIds.length
      ? db.from("customer_tags").select("*").in("id", tagIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (payments.error || shipments.error || tags.error)
    return { data: null, error: CRM_SAFE_ERROR };
  return {
    data: mapCustomerDetail(
      profile.data,
      addresses.data,
      orders.data,
      payments.data,
      shipments.data,
      notes.data,
      tags.data,
      activity.data,
    ),
    error: null,
  };
}
export async function getCustomerTags() {
  const db = createClient();
  if (!db) return { data: null, error: CRM_NOT_CONFIGURED };
  const result = await db.from("customer_tags").select("*").order("name");
  return result.error
    ? { data: null, error: CRM_SAFE_ERROR }
    : { data: result.data, error: null };
}
export async function getCrmDashboard() {
  const db = createClient();
  if (!db) return { data: null, error: CRM_NOT_CONFIGURED };
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const [total, active, vip, newCustomers, blocked] = await Promise.all([
    db.from("customer_profiles").select("id", { count: "exact", head: true }),
    db
      .from("customer_profiles")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    db
      .from("customer_profiles")
      .select("id", { count: "exact", head: true })
      .eq("segment", "vip"),
    db
      .from("customer_profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since),
    db
      .from("customer_profiles")
      .select("id", { count: "exact", head: true })
      .eq("status", "blocked"),
  ]);
  if (
    total.error ||
    active.error ||
    vip.error ||
    newCustomers.error ||
    blocked.error
  )
    return { data: null, error: CRM_SAFE_ERROR };
  return {
    data: {
      total: total.count ?? 0,
      active: active.count ?? 0,
      vip: vip.count ?? 0,
      newCustomers: newCustomers.count ?? 0,
      blocked: blocked.count ?? 0,
    },
    error: null,
  };
}
