export const NOTIFICATION_EVENTS = [
  "order_created",
  "order_confirmed",
  "payment_received",
  "payment_failed",
  "shipment_created",
  "shipment_shipped",
  "shipment_delivered",
  "stock_low",
  "stock_out",
  "coupon_created",
  "campaign_started",
  "campaign_finished",
  "user_registered",
  "password_reset",
  "admin_login",
  "admin_logout",
] as const;
export type KnownNotificationEvent = (typeof NOTIFICATION_EVENTS)[number];
export type NotificationEventType = KnownNotificationEvent | (string & {});
