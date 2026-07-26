export const WISHLIST_ALERT_TYPES = [
  "price_drop",
  "back_in_stock",
  "promotion_started",
] as const;

export type WishlistAlertType = (typeof WISHLIST_ALERT_TYPES)[number];

export type WishlistAlertPreference = {
  productId: string;
  priceDrop: boolean;
  backInStock: boolean;
  promotionStarted: boolean;
};

export type WishlistAlertStatus = "pending" | "processing" | "completed" | "failed" | "cancelled";

export type WishlistAlertAdminRow = {
  id: string;
  event_type: WishlistAlertType;
  status: WishlistAlertStatus;
  product_id: string;
  user_id: string;
  product_name: string;
  user_email: string | null;
  created_at: string;
  delivery_status: WishlistAlertStatus | null;
};

export type WishlistAlertMetrics = {
  totalPreferences: number;
  priceAlerts: number;
  stockAlerts: number;
  promotionAlerts: number;
  events: number;
  pending: number;
  completed: number;
  failed: number;
};

export type CustomerWishlistAlert = {
  id: string;
  eventType: WishlistAlertType;
  productName: string;
  productSlug: string;
  createdAt: string;
  payload: Record<string, unknown>;
};

export type WishlistAlertResult<T> = { data: T; error: null } | { data: null; error: string };
