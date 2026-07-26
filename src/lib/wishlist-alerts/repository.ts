import { createClient } from "@/lib/supabase/client";
import type { CustomerWishlistAlert, WishlistAlertAdminRow, WishlistAlertMetrics, WishlistAlertPreference, WishlistAlertResult, WishlistAlertStatus, WishlistAlertType } from "./types";
import { WISHLIST_ALERT_SAFE_ERROR } from "./constants";

type PreferenceRow = { product_id: string; price_drop: boolean; back_in_stock: boolean; promotion_started: boolean };

export async function getWishlistAlertPreferences(): Promise<WishlistAlertResult<WishlistAlertPreference[]>> {
  const db = createClient();
  if (!db) return { data: [], error: null };
  const result = await db.from("wishlist_alert_preferences").select("product_id,price_drop,back_in_stock,promotion_started");
  if (result.error) return { data: null, error: WISHLIST_ALERT_SAFE_ERROR };
  return { data: (result.data as PreferenceRow[]).map((row) => ({ productId: row.product_id, priceDrop: row.price_drop, backInStock: row.back_in_stock, promotionStarted: row.promotion_started })), error: null };
}

export async function saveWishlistAlertPreference(preference: WishlistAlertPreference): Promise<WishlistAlertResult<boolean>> {
  const db = createClient();
  if (!db) return { data: true, error: null };
  const result = await db.rpc("set_wishlist_alert_preference", {
    p_product_id: preference.productId,
    p_price_drop: preference.priceDrop,
    p_back_in_stock: preference.backInStock,
    p_promotion_started: preference.promotionStarted,
  });
  return result.error ? { data: null, error: WISHLIST_ALERT_SAFE_ERROR } : { data: true, error: null };
}

export async function getCustomerWishlistAlerts(): Promise<WishlistAlertResult<CustomerWishlistAlert[]>> {
  const db = createClient();
  if (!db) return { data: [], error: null };
  const result = await db.from("wishlist_alert_events").select("id,event_type,payload,created_at,products(name,slug)").neq("status", "cancelled").order("created_at", { ascending: false }).limit(20);
  if (result.error) return { data: null, error: WISHLIST_ALERT_SAFE_ERROR };
  type Row = { id: string; event_type: WishlistAlertType; payload: Record<string, unknown>; created_at: string; products: { name: string; slug: string } | null };
  return { data: (result.data as unknown as Row[]).flatMap((row) => row.products ? [{ id: row.id, eventType: row.event_type, productName: row.products.name, productSlug: row.products.slug, createdAt: row.created_at, payload: row.payload }] : []), error: null };
}

export async function getAdminWishlistAlerts(input: { query: string; type: "" | WishlistAlertType; status: "" | WishlistAlertStatus; page: number; pageSize: number }): Promise<WishlistAlertResult<{ rows: WishlistAlertAdminRow[]; metrics: WishlistAlertMetrics; total: number }>> {
  const db = createClient();
  if (!db) return { data: { rows: [], metrics: { totalPreferences: 0, priceAlerts: 0, stockAlerts: 0, promotionAlerts: 0, events: 0, pending: 0, completed: 0, failed: 0 }, total: 0 }, error: null };
  const result = await db.rpc("get_admin_wishlist_alerts", { p_query: input.query, p_type: input.type || null, p_status: input.status || null, p_page: input.page, p_page_size: input.pageSize });
  if (result.error) return { data: null, error: WISHLIST_ALERT_SAFE_ERROR };
  const payload = result.data as unknown as { rows: WishlistAlertAdminRow[]; metrics: WishlistAlertMetrics; total: number };
  return { data: payload, error: null };
}

export async function retryWishlistAlertDelivery(eventId: string) {
  const db = createClient();
  if (!db) return { data: null, error: WISHLIST_ALERT_SAFE_ERROR } as const;
  const result = await db.rpc("retry_wishlist_alert_delivery", { p_event_id: eventId });
  return result.error ? { data: null, error: WISHLIST_ALERT_SAFE_ERROR } as const : { data: true, error: null } as const;
}

export async function cancelWishlistAlertEvent(eventId: string) {
  const db = createClient();
  if (!db) return { data: null, error: WISHLIST_ALERT_SAFE_ERROR } as const;
  const result = await db.rpc("cancel_wishlist_alert_event", { p_event_id: eventId });
  return result.error ? { data: null, error: WISHLIST_ALERT_SAFE_ERROR } as const : { data: true, error: null } as const;
}
