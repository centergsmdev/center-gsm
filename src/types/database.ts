export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];
type Timestamps = { created_at: string; updated_at: string };
type Table<Row, Insert = Partial<Row>, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type Category = Timestamps & {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  show_in_header: boolean;
  sort_order: number;
  search_name: string;
};
type Brand = Timestamps & {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  is_active: boolean;
  search_name: string;
};
type Product = Timestamps & {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description: string | null;
  category_id: string;
  brand_id: string;
  price: number;
  old_price: number | null;
  stock_quantity: number;
  is_active: boolean;
  is_featured: boolean;
  is_weekly_deal: boolean;
  is_latest_phone: boolean;
  warranty_months: number;
  show_installments: boolean;
  installment_count: number;
  installment_note: string | null;
  rating: number;
  review_count: number;
  search_text: string;
};
export type ProductReview = Timestamps & {
  id: string;
  product_id: string;
  user_id: string | null;
  author_name: string;
  rating: number;
  title: string | null;
  body: string;
  image_paths: string[];
  status: "pending" | "approved" | "rejected";
  is_admin_created: boolean;
  admin_reply: string | null;
  replied_at: string | null;
  replied_by: string | null;
};
type ProductImage = Timestamps & {
  id: string;
  product_id: string;
  url: string;
  path: string | null;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
  color_id: string | null;
};
type ProductColor = Timestamps & {
  id: string;
  product_id: string;
  name: string;
  display_name: string | null;
  hex_code: string;
  is_active: boolean;
  sort_order: number;
};
type ProductVariant = Timestamps & {
  id: string;
  product_id: string;
  name: string;
  sku: string;
  attributes: Json;
  price: number;
  old_price: number | null;
  stock_quantity: number;
  is_active: boolean;
  color_id: string | null;
  storage_value: number | null;
  storage_unit: "GB" | "TB" | null;
  barcode: string | null;
  sort_order: number;
  is_default: boolean;
};
export type LiveChatConversation = {
  id: string;
  visitor_token: string;
  customer_name: string;
  status: "open" | "closed";
  ai_active: boolean;
  last_message_at: string;
  created_at: string;
  updated_at: string;
};
export type LiveChatMessage = {
  id: string;
  conversation_id: string;
  sender: "customer" | "admin" | "ai";
  body: string;
  attachment_path: string | null;
  attachment_name: string | null;
  attachment_mime: string | null;
  read_at: string | null;
  reply_to_message_id: string | null;
  created_at: string;
};
export type LiveChatSettings = {
  id: boolean;
  ai_enabled: boolean;
  auto_reply_message: string;
  updated_at: string;
};
export type LiveChatCallStatus =
  | "requesting"
  | "ringing"
  | "accepted"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "ended"
  | "rejected"
  | "missed"
  | "failed";
export type LiveChatCall = {
  id: string;
  conversation_id: string;
  status: LiveChatCallStatus;
  accepted_by: string | null;
  signaling_nonce: string;
  revision: number;
  requested_at: string;
  accepted_at: string | null;
  connecting_at: string | null;
  connected_at: string | null;
  ended_at: string | null;
  expires_at: string;
  auth_expires_at: string;
  duration_seconds: number | null;
  ended_by: "customer" | "admin" | "system" | null;
  end_reason: string | null;
  created_at: string;
  updated_at: string;
};
export type LiveChatCallEvent = {
  id: number;
  call_id: string;
  conversation_id: string;
  event_type:
    | "requested"
    | "accepted"
    | "connecting"
    | "started"
    | "reconnecting"
    | "ended"
    | "rejected"
    | "missed"
    | "failed";
  actor_role: "customer" | "admin" | "system";
  metadata: Json;
  created_at: string;
};
export type LiveChatVideoSettings = {
  id: boolean;
  enabled: boolean;
  avatar_mode: "static" | "audio-reactive";
  avatar_display_name: string;
  avatar_image_url: string | null;
  avatar_image_path: string | null;
  ring_timeout_seconds: number;
  max_duration_seconds: number;
  updated_at: string;
  updated_by: string | null;
};
export type SiteSettings = {
  id: boolean;
  company_name: string;
  tax_number: string | null;
  logo_url: string | null;
  contact_email: string | null;
  phone: string | null;
  address: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
  twitter_url: string | null;
  free_shipping_limit: number;
  same_day_shipping_enabled: boolean;
  phone_approval_enabled: boolean;
  bank_transfer_enabled: boolean;
  updated_at: string;
  updated_by: string | null;
};
export type ContentPageRecord = {
  slug: string;
  eyebrow: string;
  title: string;
  description: string;
  body_html: string;
  is_published: boolean;
  updated_at: string;
  updated_by: string | null;
};
export type FaqItem = Timestamps & {
  id: string;
  category: string;
  question: string;
  answer: string;
  sort_order: number;
  is_published: boolean;
  updated_by: string | null;
};
export type AdvertisementCenterSettings = {
  id: boolean;
  daily_budget: number;
  target_country: string;
  excluded_regions: string[];
  updated_at: string;
  updated_by: string | null;
};
export type AdvertisementProductSettings = {
  product_id: string;
  is_included: boolean;
  priority: "very_high" | "high" | "normal" | "low";
  ad_types: string[];
  updated_at: string;
  updated_by: string | null;
};
type Profile = Timestamps & {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  birth_date: string | null;
};
type Address = Timestamps & {
  id: string;
  user_id: string;
  title: string;
  recipient_name: string;
  phone: string;
  city: string;
  district: string;
  neighborhood: string | null;
  postal_code: string | null;
  address_line: string;
  is_default: boolean;
};
type Order = Timestamps & {
  id: string;
  order_number: string;
  user_id: string | null;
  status: string;
  payment_method: string;
  payment_status: string;
  delivery_method: string;
  subtotal: number;
  discount_total: number;
  shipping_total: number;
  tax_total: number;
  grand_total: number;
  loyalty_points_earned: number;
  loyalty_points_redeemed: number;
  loyalty_discount: number;
  loyalty_snapshot: Json;
  gift_card_amount: number;
  store_credit_amount: number;
  gift_card_snapshot: Json;
  store_credit_snapshot: Json;
  delivery_address: Json;
  billing_address: Json;
  admin_note: string | null;
  status_history: Json;
  coupon_snapshot: Json | null;
  campaign_snapshots: Json;
  expected_payment: number;
  payment_note: string | null;
  payment_account_snapshot: Json | null;
  fulfillment_status:
    | "unfulfilled"
    | "partially_fulfilled"
    | "fulfilled"
    | "shipped"
    | "partially_delivered"
    | "delivered"
    | "returned"
    | "cancelled";
  shipping_method: "standard" | "express" | "store_pickup" | "same_day";
  shipping_method_snapshot: Json;
  selected_shipping_provider: string | null;
  selected_shipping_name: string | null;
  estimated_delivery_days: number | null;
  shipping_note: string | null;
  coupon_code: string | null;
  coupon_name: string | null;
  coupon_type: string | null;
  coupon_discount_amount: number;
  coupon_discount_percentage: number | null;
  free_shipping: boolean;
  promotion_snapshot: Json;
};
type OrderItem = Timestamps & {
  id: string;
  order_id: string;
  product_id: string | null;
  variant_id: string | null;
  product_name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  discount_total: number;
  line_total: number;
  product_snapshot: Json;
};
type Favorite = Timestamps & {
  id: string;
  user_id: string;
  product_id: string;
};
type Campaign = Timestamps & {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  minimum_order_amount: number;
  maximum_discount_amount: number | null;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  category_id: string | null;
  brand_id: string | null;
  product_id: string | null;
};
type Coupon = Timestamps & {
  id: string;
  code: string;
  description: string | null;
  discount_type: "percentage" | "fixed" | "free_shipping";
  discount_value: number;
  minimum_order_amount: number;
  maximum_discount_amount: number | null;
  usage_limit: number | null;
  usage_limit_per_user: number | null;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  title: string;
  priority: number;
  is_stackable: boolean;
};
type CouponRedemption = Timestamps & {
  id: string;
  coupon_id: string;
  user_id: string | null;
  order_id: string | null;
  reservation_token: string;
  status: "reserved" | "redeemed" | "released" | "cancelled";
  discount_amount: number;
  reserved_at: string;
  redeemed_at: string | null;
  released_at: string | null;
};
type PromotionRule = Timestamps & {
  id: string;
  coupon_id: string;
  name: string;
  target_type:
    | "all"
    | "category"
    | "brand"
    | "product"
    | "user"
    | "customer_segment"
    | "first_order";
  target_id: string | null;
  is_active: boolean;
  priority: number;
};
type PromotionCondition = Timestamps & {
  id: string;
  rule_id: string;
  condition_type:
    | "minimum_amount"
    | "category"
    | "brand"
    | "product"
    | "user"
    | "customer_segment"
    | "first_order";
  operator: "equals" | "in" | "gte" | "lte";
  configuration: Json;
};
type PromotionUsageLog = {
  id: string;
  coupon_id: string | null;
  order_id: string | null;
  user_id: string | null;
  event_type:
    | "validated"
    | "validation_failed"
    | "reserved"
    | "redeemed"
    | "released"
    | "expired"
    | "applied"
    | "removed";
  discount_amount: number;
  metadata: Json;
  created_at: string;
};
type CouponUsage = Timestamps & {
  id: string;
  coupon_id: string;
  user_id: string | null;
  order_id: string;
  used_at: string;
};
type PaymentAccount = Timestamps & {
  id: string;
  provider: "manual_bank_transfer";
  bank_name: string;
  account_holder: string;
  iban: string;
  branch: string | null;
  description: string | null;
  is_active: boolean;
  is_default: boolean;
};
type PaymentPartner = Timestamps & {
  id: string;
  name: string;
  logo_url: string | null;
  is_active: boolean;
  is_default: boolean;
  sort_order: number;
};
type PaymentTransaction = Timestamps & {
  id: string;
  order_id: string;
  payment_account_id: string | null;
  provider: string;
  transaction_type: "payment" | "cancel" | "refund";
  status:
    | "pending"
    | "awaiting_payment"
    | "paid"
    | "failed"
    | "cancelled"
    | "refunded";
  amount: number;
  currency: "TRY";
  reference: string;
  provider_reference: string | null;
  note: string | null;
  metadata: Json;
};
type PaymentReceipt = Timestamps & {
  id: string;
  order_id: string;
  upload_token: string;
  storage_path: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  status: "awaiting_upload" | "pending_review" | "approved" | "rejected";
  uploaded_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
};
type PaymentProvider = Timestamps & {
  id: string;
  code: "mock" | "iyzico" | "paytr" | "param";
  name: string;
  is_active: boolean;
  mode: "sandbox" | "production";
  health_status: "unknown" | "healthy" | "degraded" | "down";
  last_health_check_at: string | null;
  last_connected_at: string | null;
  capabilities: Json;
};
type PaymentProviderSetting = Timestamps & {
  id: string;
  provider_id: string;
  setting_key: string;
  public_value: Json | null;
  secret_hash: string | null;
  secret_env_key: string | null;
};
type PaymentWebhook = {
  id: string;
  provider_id: string;
  external_event_id: string;
  event_type: string;
  status: "received" | "processing" | "processed" | "failed" | "ignored";
  signature_valid: boolean;
  payload_hash: string;
  payload_summary: Json;
  retry_count: number;
  last_error: string | null;
  received_at: string;
  processed_at: string | null;
  created_at: string;
};
type PaymentRefund = Timestamps & {
  id: string;
  payment_transaction_id: string;
  order_id: string;
  provider_id: string;
  refund_type: "full" | "partial";
  amount: number;
  status: "pending" | "succeeded" | "failed" | "cancelled";
  provider_reference: string | null;
  reason: string | null;
  metadata: Json;
  requested_by: string | null;
  processed_at: string | null;
};
type Warehouse = Timestamps & {
  id: string;
  name: string;
  code: string;
  description: string | null;
  address: string | null;
  is_default: boolean;
  is_active: boolean;
};
type Inventory = Timestamps & {
  id: string;
  warehouse_id: string;
  product_id: string;
  quantity_on_hand: number;
  quantity_reserved: number;
  reorder_level: number;
};
type InventoryMovement = {
  id: string;
  warehouse_id: string;
  product_id: string;
  movement_type:
    | "initial_stock"
    | "manual_increase"
    | "manual_decrease"
    | "order_reservation"
    | "order_sale"
    | "reservation_release"
    | "order_cancel_return"
    | "customer_return"
    | "stock_correction";
  quantity: number;
  quantity_before: number;
  quantity_after: number;
  order_id: string | null;
  reference: string | null;
  note: string;
  created_by: string | null;
  created_at: string;
};
type InventoryReservation = Timestamps & {
  id: string;
  order_id: string;
  order_item_id: string;
  warehouse_id: string;
  product_id: string;
  quantity: number;
  status: "active" | "completed" | "released" | "expired";
  expires_at: string;
  released_at: string | null;
  completed_at: string | null;
};
type ShippingCarrier = Timestamps & {
  id: string;
  name: string;
  code: string;
  provider_key: string;
  tracking_url_template: string | null;
  logo_url: string | null;
  support_phone: string | null;
  description: string | null;
  is_active: boolean;
  is_default: boolean;
  supports_api: boolean;
  estimated_delivery_days: number;
  free_shipping_label: string;
  customer_description: string | null;
};
type Shipment = Timestamps & {
  id: string;
  order_id: string;
  carrier_id: string;
  provider_key: string;
  shipment_number: string;
  tracking_number: string | null;
  tracking_url: string | null;
  status:
    | "pending"
    | "preparing"
    | "ready_for_shipment"
    | "shipped"
    | "in_transit"
    | "out_for_delivery"
    | "delivered"
    | "delivery_failed"
    | "return_started"
    | "returned"
    | "cancelled";
  carrier_snapshot: Json;
  recipient_snapshot: Json;
  package_snapshot: Json;
  shipping_cost: number;
  currency: "TRY";
  admin_note: string | null;
  shipped_at: string | null;
  estimated_delivery_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  created_by: string | null;
  external_shipment_id: string | null;
  idempotency_key: string | null;
  provider_status: string | null;
  last_synced_at: string | null;
};
type ShipmentItem = {
  id: string;
  shipment_id: string;
  order_item_id: string;
  quantity: number;
  created_at: string;
};
type ShipmentEvent = {
  id: string;
  shipment_id: string;
  status: Shipment["status"];
  title: string;
  description: string | null;
  location: string | null;
  event_time: string;
  provider_event_code: string | null;
  created_by: string | null;
  created_at: string;
  external_event_id: string | null;
  event_hash: string | null;
  metadata: Json;
};
type ShippingProviderSetting = Timestamps & {
  id: string;
  carrier_id: string;
  provider_key:
    | "manual"
    | "mock"
    | "yurtici"
    | "aras"
    | "mng"
    | "surat"
    | "ptt"
    | "hepsijet";
  environment: "sandbox" | "production";
  is_active: boolean;
  configuration_reference: string | null;
  webhook_secret_hash: string | null;
  health_status: "unknown" | "healthy" | "degraded" | "down";
  last_health_check_at: string | null;
  last_success_at: string | null;
  last_error_at: string | null;
};
type ShippingWebhook = {
  id: string;
  provider_key: string;
  external_event_id: string;
  event_type: string;
  tracking_number: string | null;
  shipment_id: string | null;
  payload_summary: Json;
  payload_hash: string;
  signature_valid: boolean;
  status: "received" | "processing" | "processed" | "failed" | "ignored";
  retry_count: number;
  received_at: string;
  processed_at: string | null;
  last_error: string | null;
  created_at: string;
};
type ShippingLabel = Timestamps & {
  id: string;
  shipment_id: string;
  provider_key: string;
  label_format: "pdf" | "zpl" | "png" | "html";
  storage_path: string | null;
  content_hash: string;
  status: "pending" | "ready" | "invalidated" | "failed";
};
type ShippingRateQuote = {
  id: string;
  provider_key: string;
  order_id: string | null;
  warehouse_id: string;
  destination_postal_code: string;
  package_count: number;
  total_weight: number;
  desi: number;
  amount: number;
  currency: "TRY";
  estimated_delivery_min: number;
  estimated_delivery_max: number;
  expires_at: string;
  created_at: string;
};
type ShippingSyncJob = {
  id: string;
  shipment_id: string | null;
  provider_key: string;
  job_type:
    | "tracking_sync"
    | "label_create"
    | "shipment_create"
    | "shipment_cancel"
    | "health_check";
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  attempt_count: number;
  scheduled_at: string;
  started_at: string | null;
  completed_at: string | null;
  last_error: string | null;
  created_at: string;
};
type AuditLog = {
  id: string;
  actor_user_id: string | null;
  actor_email: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  old_data: Json | null;
  new_data: Json | null;
  metadata: Json;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};
type NotificationTemplate = Timestamps & {
  id: string;
  code: string;
  name: string;
  channel: "email" | "sms" | "whatsapp" | "push" | "in_app";
  subject: string | null;
  body: string;
  variables: Json;
  is_active: boolean;
};
type NotificationEvent = {
  id: string;
  event_type: string;
  entity_type: string;
  entity_id: string | null;
  payload: Json;
  status: "pending" | "processing" | "processed" | "failed";
  created_at: string;
  processed_at: string | null;
};
type NotificationQueue = {
  id: string;
  event_id: string;
  template_id: string | null;
  channel: NotificationTemplate["channel"];
  recipient: string;
  status: "pending" | "processing" | "sent" | "failed" | "cancelled";
  retry_count: number;
  scheduled_at: string;
  processed_at: string | null;
  last_error: string | null;
  created_at: string;
};
type NotificationLog = {
  id: string;
  queue_id: string;
  channel: NotificationTemplate["channel"];
  recipient: string;
  status: "pending" | "sent" | "failed";
  provider: string;
  response: Json;
  created_at: string;
};
type CustomerProfile = Timestamps & {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  status: "active" | "inactive" | "blocked";
  segment: "new" | "active" | "vip" | "inactive" | "blocked";
  lifetime_value: number;
  order_count: number;
  last_order_at: string | null;
  last_login_at: string | null;
  marketing_opt_in: boolean;
};
type CustomerNote = Timestamps & {
  id: string;
  customer_id: string;
  admin_id: string;
  note: string;
  is_private: boolean;
};
type CustomerTag = {
  id: string;
  name: string;
  color: string;
  description: string | null;
  created_at: string;
};
type CustomerTagRelation = {
  customer_id: string;
  tag_id: string;
  created_at: string;
};
type CustomerActivity = {
  id: string;
  customer_id: string;
  activity_type: string;
  description: string;
  metadata: Json;
  created_at: string;
};
type AnalyticsDailyMetric = Timestamps & {
  id: string;
  metric_date: string;
  gross_revenue: number;
  net_revenue: number;
  discount_total: number;
  shipping_revenue: number;
  tax_total: number;
  refund_total: number;
  order_count: number;
  completed_order_count: number;
  cancelled_order_count: number;
  customer_count: number;
  new_customer_count: number;
  average_order_value: number;
  items_sold: number;
};
type AnalyticsProductMetric = Timestamps & {
  id: string;
  metric_date: string;
  product_id: string | null;
  product_name: string;
  sku: string;
  brand_name: string | null;
  units_sold: number;
  gross_revenue: number;
  net_revenue: number;
  discount_total: number;
  refund_quantity: number;
  refund_total: number;
  order_count: number;
};
type AnalyticsCustomerMetric = Timestamps & {
  id: string;
  metric_date: string;
  customer_id: string | null;
  customer_key: string;
  order_count: number;
  revenue: number;
  items_purchased: number;
  refund_total: number;
  first_order_at: string | null;
  last_order_at: string | null;
  is_repeat_customer: boolean;
};
type AnalyticsEvent = {
  id: string;
  event_name: string;
  entity_type: string;
  entity_id: string;
  user_id: string | null;
  session_id: string | null;
  payload: Json;
  occurred_at: string;
  created_at: string;
};
type LoyaltyAccount = Timestamps & {
  id: string;
  user_id: string;
  available_points: number;
  pending_points: number;
  lifetime_earned: number;
  lifetime_redeemed: number;
};
type LoyaltyTransaction = Timestamps & {
  id: string;
  account_id: string;
  user_id: string;
  order_id: string | null;
  type:
    | "earn"
    | "redeem"
    | "refund"
    | "adjustment"
    | "bonus"
    | "manual_add"
    | "manual_remove";
  points: number;
  balance_after: number;
  status: "pending" | "completed" | "cancelled";
  description: string | null;
  metadata: Json;
  idempotency_key: string | null;
};
type RewardRule = Timestamps & {
  id: string;
  name: string;
  rule_type:
    "purchase" | "first_order" | "birthday" | "category" | "brand" | "campaign";
  points_per_try: number;
  bonus_points: number;
  redemption_value_per_point: number;
  minimum_order_amount: number;
  maximum_redeemable_points: number | null;
  category_id: string | null;
  brand_id: string | null;
  campaign_id: string | null;
  priority: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
};
type RewardRedemption = Timestamps & {
  id: string;
  account_id: string;
  user_id: string;
  order_id: string;
  points: number;
  discount_amount: number;
  status: "reserved" | "redeemed" | "refunded" | "cancelled";
};
type GiftCard = Timestamps & {
  id: string;
  code: string;
  title: string;
  initial_balance: number;
  balance: number;
  currency: string;
  owner_user_id: string | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  is_single_use: boolean;
  gift_note: string | null;
  created_by: string | null;
};
type GiftCardTransaction = Timestamps & {
  id: string;
  gift_card_id: string;
  user_id: string | null;
  order_id: string | null;
  type: "issue" | "redeem" | "topup" | "refund" | "adjustment";
  amount: number;
  balance_after: number;
  description: string | null;
  idempotency_key: string | null;
};
type StoreCreditAccount = Timestamps & {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
  lifetime_added: number;
  lifetime_spent: number;
};
type StoreCreditTransaction = Timestamps & {
  id: string;
  account_id: string;
  user_id: string;
  order_id: string | null;
  return_request_id: string | null;
  type: "load" | "spend" | "refund" | "bonus" | "adjustment";
  amount: number;
  balance_after: number;
  description: string | null;
  metadata: Json;
  idempotency_key: string | null;
};
export type ReturnStatus =
  | "new"
  | "reviewing"
  | "awaiting_photos"
  | "approved"
  | "rejected"
  | "awaiting_product"
  | "product_received"
  | "inspected"
  | "refund_approved"
  | "exchange_approved"
  | "refund_completed"
  | "exchange_completed"
  | "cancelled";
export type ReturnReason =
  | "wrong_product"
  | "damaged_product"
  | "missing_product"
  | "shipping_damage"
  | "changed_mind"
  | "defective_product"
  | "warranty"
  | "other";
type ReturnRequest = Timestamps & {
  id: string;
  rma_number: string;
  order_id: string;
  user_id: string;
  status: ReturnStatus;
  request_type: "return" | "exchange" | "warranty";
  reason: ReturnReason;
  description: string;
  internal_note: string | null;
  customer_note: string | null;
  closed_at: string | null;
};
type ReturnRequestItem = Timestamps & {
  id: string;
  return_request_id: string;
  order_item_id: string;
  quantity: number;
  resolution: "refund" | "exchange" | "repair" | "reject" | null;
};
type ReturnMessage = Timestamps & {
  id: string;
  return_request_id: string;
  sender_user_id: string;
  sender_role: "customer" | "admin";
  message: string;
  is_internal: boolean;
};
type ReturnAttachment = Timestamps & {
  id: string;
  return_request_id: string;
  message_id: string | null;
  uploaded_by: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  file_size: number;
};
type ReturnStatusHistory = Timestamps & {
  id: string;
  return_request_id: string;
  from_status: string | null;
  to_status: string;
  changed_by: string;
  note: string | null;
};

type WishlistAlertPreferenceRow = Timestamps & {
  id: string;
  user_id: string;
  product_id: string;
  price_drop: boolean;
  back_in_stock: boolean;
  promotion_started: boolean;
};
type WishlistAlertEventRow = {
  id: string;
  user_id: string;
  product_id: string;
  event_type: string;
  idempotency_key: string;
  payload: Json;
  status: string;
  created_at: string;
  processed_at: string | null;
  cancelled_at: string | null;
};
type WishlistAlertDeliveryRow = Timestamps & {
  id: string;
  event_id: string;
  user_id: string;
  channel: string;
  status: string;
  attempt_count: number;
  last_error: string | null;
  delivered_at: string | null;
};
type ProductPriceHistoryRow = {
  id: string;
  product_id: string;
  old_price: number;
  new_price: number;
  change_percentage: number;
  source: string;
  changed_at: string;
};
type ProductStockHistoryRow = {
  id: string;
  product_id: string;
  old_stock: number;
  new_stock: number;
  old_status: string;
  new_status: string;
  warehouse_id: string | null;
  changed_at: string;
};

export type InstallmentApplicationRow = Timestamps & {
  id: string;
  application_number: string;
  idempotency_key_hash: string;
  draft_token_hash: string | null;
  user_id: string | null;
  applicant_name: string;
  phone_e164: string;
  email: string | null;
  product_id: string;
  variant_id: string | null;
  product_name_snapshot: string;
  variant_title_snapshot: string | null;
  sku_snapshot: string;
  price_snapshot: number;
  image_url_snapshot: string | null;
  color_snapshot: string | null;
  storage_value_snapshot: number | null;
  storage_unit_snapshot: "GB" | "TB" | null;
  status:
    | "draft"
    | "submitted"
    | "under_review"
    | "approved"
    | "rejected"
    | "cancelled";
  revision: number;
  submitted_at: string | null;
  decision_at: string | null;
  decision_by: string | null;
  rejection_reason_public: string | null;
  internal_note: string | null;
  request_ip_hash: string | null;
  user_agent_summary: string | null;
  retention_review_at: string;
};

export type InstallmentApplicationDocumentRow = {
  id: string;
  application_id: string;
  document_type: "identity_front" | "identity_back" | "residence" | "signature";
  storage_path: string;
  original_name: string;
  original_mime_type: string;
  stored_mime_type: "image/webp" | "application/pdf";
  size_bytes: number;
  sha256: string;
  width: number | null;
  height: number | null;
  created_at: string;
};

export type InstallmentApplicationConsentRow = {
  id: string;
  application_id: string;
  consent_type:
    "privacy_notice_acknowledged" | "application_terms_acknowledged";
  notice_version: string;
  acknowledged_at: string;
};

export type InstallmentApplicationEventRow = {
  id: string;
  application_id: string;
  event_type: string;
  actor_type: "customer" | "admin" | "system";
  actor_user_id: string | null;
  metadata: Json;
  created_at: string;
};

export type InstallmentRateLimitRow = {
  key_hash: string;
  action: "draft" | "upload" | "submit";
  window_started_at: string;
  request_count: number;
  updated_at: string;
};

export type InstallmentContractTemplateRow = Timestamps & {
  id: string;
  title: string;
  version: string;
  content_html: string;
  content_sha256: string;
  is_active: boolean;
  created_by: string | null;
};

export type InstallmentApplicationContractRow = {
  application_id: string;
  contract_template_id: string;
  contract_title: string;
  contract_version: string;
  rendered_contract_content: string;
  contract_content_hash: string;
  presented_at: string;
  accepted_at: string | null;
  signature_document_id: string | null;
  created_at: string;
};

export type PaymentPlanConfigurationRow = {
  id: string;
  revision: number;
  threshold_minor: number;
  above_threshold_down_payment_bps: number;
  below_threshold_down_payment_bps: number;
  installment_finance_charge_bps: number;
  installment_counts: number[];
  credit_card_finance_charge_bps: number;
  credit_card_installment_counts: number[];
  is_active: boolean;
  created_by: string | null;
  created_at: string;
};

export type InstallmentApplicationPaymentPlanRow = {
  application_id: string;
  payment_type: "installment_application";
  payment_config_id: string;
  payment_config_revision: number;
  product_price_minor: number;
  threshold_minor: number;
  down_payment_rate_bps: number;
  down_payment_amount_minor: number;
  remaining_principal_minor: number;
  finance_charge_rate_bps: number;
  finance_charge_amount_minor: number;
  financed_total_minor: number;
  installment_count: number;
  installment_schedule: Array<{
    installment: number;
    amount_minor: number;
  }>;
  total_payable_minor: number;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      payment_plan_configurations: Table<
        PaymentPlanConfigurationRow,
        Partial<PaymentPlanConfigurationRow> &
          Pick<
            PaymentPlanConfigurationRow,
            | "revision"
            | "threshold_minor"
            | "above_threshold_down_payment_bps"
            | "below_threshold_down_payment_bps"
            | "installment_finance_charge_bps"
            | "installment_counts"
            | "credit_card_finance_charge_bps"
            | "credit_card_installment_counts"
          >
      >;
      installment_application_payment_plans: Table<
        InstallmentApplicationPaymentPlanRow,
        Partial<InstallmentApplicationPaymentPlanRow> &
          Pick<
            InstallmentApplicationPaymentPlanRow,
            | "application_id"
            | "payment_type"
            | "payment_config_id"
            | "payment_config_revision"
            | "product_price_minor"
            | "threshold_minor"
            | "down_payment_rate_bps"
            | "down_payment_amount_minor"
            | "remaining_principal_minor"
            | "finance_charge_rate_bps"
            | "finance_charge_amount_minor"
            | "financed_total_minor"
            | "installment_count"
            | "installment_schedule"
            | "total_payable_minor"
          >
      >;
      installment_contract_templates: Table<
        InstallmentContractTemplateRow,
        Partial<InstallmentContractTemplateRow> &
          Pick<
            InstallmentContractTemplateRow,
            "title" | "version" | "content_html"
          >
      >;
      installment_application_contracts: Table<
        InstallmentApplicationContractRow,
        Partial<InstallmentApplicationContractRow> &
          Pick<
            InstallmentApplicationContractRow,
            | "application_id"
            | "contract_template_id"
            | "contract_title"
            | "contract_version"
            | "rendered_contract_content"
            | "presented_at"
          >
      >;
      installment_applications: Table<
        InstallmentApplicationRow,
        Partial<InstallmentApplicationRow> &
          Pick<
            InstallmentApplicationRow,
            | "application_number"
            | "idempotency_key_hash"
            | "applicant_name"
            | "phone_e164"
            | "product_id"
            | "product_name_snapshot"
            | "sku_snapshot"
            | "price_snapshot"
          >
      >;
      installment_application_documents: Table<
        InstallmentApplicationDocumentRow,
        Partial<InstallmentApplicationDocumentRow> &
          Pick<
            InstallmentApplicationDocumentRow,
            | "application_id"
            | "document_type"
            | "storage_path"
            | "original_name"
            | "original_mime_type"
            | "stored_mime_type"
            | "size_bytes"
            | "sha256"
          >
      >;
      installment_application_consents: Table<
        InstallmentApplicationConsentRow,
        Partial<InstallmentApplicationConsentRow> &
          Pick<
            InstallmentApplicationConsentRow,
            "application_id" | "consent_type" | "notice_version"
          >
      >;
      installment_application_events: Table<
        InstallmentApplicationEventRow,
        Partial<InstallmentApplicationEventRow> &
          Pick<
            InstallmentApplicationEventRow,
            "application_id" | "event_type" | "actor_type"
          >
      >;
      installment_rate_limits: Table<
        InstallmentRateLimitRow,
        InstallmentRateLimitRow,
        Partial<InstallmentRateLimitRow>
      >;
      sales_campaigns: Table<import("@/types/sales-campaign").SalesCampaign>;
      categories: Table<
        Category,
        Partial<Category> & Pick<Category, "name" | "slug">
      >;
      brands: Table<Brand, Partial<Brand> & Pick<Brand, "name" | "slug">>;
      products: Table<
        Product,
        Partial<Product> &
          Pick<
            Product,
            "name" | "slug" | "sku" | "category_id" | "brand_id" | "price"
          >
      >;
      product_reviews: Table<
        ProductReview,
        Partial<ProductReview> &
          Pick<ProductReview, "product_id" | "author_name" | "rating" | "body">,
        Partial<ProductReview>
      >;
      live_chat_conversations: Table<
        LiveChatConversation,
        Partial<LiveChatConversation> &
          Pick<LiveChatConversation, "visitor_token" | "customer_name">
      >;
      live_chat_messages: Table<
        LiveChatMessage,
        Partial<LiveChatMessage> &
          Pick<LiveChatMessage, "conversation_id" | "sender" | "body">,
        Partial<LiveChatMessage>
      >;
      live_chat_settings: Table<LiveChatSettings>;
      live_chat_video_settings: Table<LiveChatVideoSettings>;
      live_chat_calls: Table<LiveChatCall, never, never>;
      live_chat_call_events: Table<LiveChatCallEvent, never, never>;
      live_chat_call_rate_limits: Table<
        {
          key_hash: string;
          window_started_at: string;
          request_count: number;
          updated_at: string;
        },
        never,
        never
      >;
      live_chat_push_subscriptions: Table<{
        id: string;
        conversation_id: string;
        visitor_token: string;
        endpoint: string;
        p256dh: string;
        auth: string;
        created_at: string;
        updated_at: string;
      }>;
      site_settings: Table<SiteSettings>;
      content_pages: Table<ContentPageRecord>;
      faq_items: Table<
        FaqItem,
        Partial<FaqItem> & Pick<FaqItem, "category" | "question" | "answer">,
        Partial<FaqItem>
      >;
      advertisement_center_settings: Table<AdvertisementCenterSettings>;
      advertisement_product_settings: Table<
        AdvertisementProductSettings,
        Partial<AdvertisementProductSettings> &
          Pick<AdvertisementProductSettings, "product_id">
      >;
      product_images: Table<
        ProductImage,
        Partial<ProductImage> & Pick<ProductImage, "product_id" | "url">
      >;
      product_colors: Table<
        ProductColor,
        Partial<ProductColor> &
          Pick<ProductColor, "product_id" | "name" | "hex_code">
      >;
      product_variants: Table<
        ProductVariant,
        Partial<ProductVariant> &
          Pick<ProductVariant, "product_id" | "name" | "sku" | "price">
      >;
      profiles: Table<Profile, Partial<Profile> & Pick<Profile, "id">>;
      addresses: Table<
        Address,
        Partial<Address> &
          Pick<
            Address,
            | "user_id"
            | "title"
            | "recipient_name"
            | "phone"
            | "city"
            | "district"
            | "address_line"
          >
      >;
      orders: Table<
        Order,
        Partial<Order> &
          Pick<
            Order,
            | "order_number"
            | "user_id"
            | "status"
            | "payment_method"
            | "payment_status"
            | "delivery_method"
            | "subtotal"
            | "grand_total"
            | "delivery_address"
            | "billing_address"
          >
      >;
      order_items: Table<
        OrderItem,
        Partial<OrderItem> &
          Pick<
            OrderItem,
            | "order_id"
            | "product_name"
            | "sku"
            | "quantity"
            | "unit_price"
            | "line_total"
          >
      >;
      favorites: Table<
        Favorite,
        Partial<Favorite> & Pick<Favorite, "user_id" | "product_id">
      >;
      campaigns: Table<
        Campaign,
        Partial<Campaign> &
          Pick<
            Campaign,
            | "name"
            | "slug"
            | "discount_type"
            | "discount_value"
            | "starts_at"
            | "ends_at"
          >
      >;
      coupons: Table<
        Coupon,
        Partial<Coupon> &
          Pick<
            Coupon,
            | "code"
            | "discount_type"
            | "discount_value"
            | "starts_at"
            | "ends_at"
          >
      >;
      coupon_usages: Table<
        CouponUsage,
        Partial<CouponUsage> & Pick<CouponUsage, "coupon_id" | "order_id">
      >;
      coupon_redemptions: Table<CouponRedemption, never, never>;
      promotion_rules: Table<PromotionRule, never, never>;
      promotion_conditions: Table<PromotionCondition, never, never>;
      promotion_usage_logs: Table<PromotionUsageLog, never, never>;
      payment_accounts: Table<
        PaymentAccount,
        Partial<PaymentAccount> &
          Pick<PaymentAccount, "bank_name" | "account_holder" | "iban">
      >;
      payment_transactions: Table<
        PaymentTransaction,
        Partial<PaymentTransaction> &
          Pick<
            PaymentTransaction,
            "order_id" | "provider" | "status" | "amount" | "reference"
          >
      >;
      payment_receipts: Table<PaymentReceipt, never, Partial<PaymentReceipt>>;
      payment_partners: Table<
        PaymentPartner,
        Partial<PaymentPartner> & Pick<PaymentPartner, "name">
      >;
      payment_providers: Table<PaymentProvider, never, never>;
      payment_provider_settings: Table<PaymentProviderSetting, never, never>;
      payment_webhooks: Table<PaymentWebhook, never, never>;
      payment_refunds: Table<PaymentRefund, never, never>;
      warehouses: Table<
        Warehouse,
        Partial<Warehouse> & Pick<Warehouse, "name" | "code">
      >;
      inventory: Table<
        Inventory,
        Partial<Inventory> & Pick<Inventory, "warehouse_id" | "product_id">
      >;
      inventory_movements: Table<
        InventoryMovement,
        Partial<InventoryMovement> &
          Pick<
            InventoryMovement,
            | "warehouse_id"
            | "product_id"
            | "movement_type"
            | "quantity"
            | "quantity_before"
            | "quantity_after"
            | "note"
          >
      >;
      inventory_reservations: Table<
        InventoryReservation,
        Partial<InventoryReservation> &
          Pick<
            InventoryReservation,
            | "order_id"
            | "order_item_id"
            | "warehouse_id"
            | "product_id"
            | "quantity"
          >
      >;
      shipping_carriers: Table<
        ShippingCarrier,
        Partial<ShippingCarrier> &
          Pick<ShippingCarrier, "name" | "code" | "provider_key">
      >;
      shipments: Table<
        Shipment,
        Partial<Shipment> &
          Pick<
            Shipment,
            | "order_id"
            | "carrier_id"
            | "provider_key"
            | "shipment_number"
            | "carrier_snapshot"
            | "recipient_snapshot"
          >
      >;
      shipment_items: Table<
        ShipmentItem,
        Partial<ShipmentItem> &
          Pick<ShipmentItem, "shipment_id" | "order_item_id" | "quantity">
      >;
      shipment_events: Table<
        ShipmentEvent,
        Partial<ShipmentEvent> &
          Pick<ShipmentEvent, "shipment_id" | "status" | "title">
      >;
      shipping_provider_settings: Table<ShippingProviderSetting, never, never>;
      shipping_webhooks: Table<ShippingWebhook, never, never>;
      shipping_labels: Table<ShippingLabel, never, never>;
      shipping_rate_quotes: Table<ShippingRateQuote, never, never>;
      shipping_sync_jobs: Table<ShippingSyncJob, never, never>;
      audit_logs: Table<AuditLog, never, never>;
      notification_templates: Table<NotificationTemplate, never, never>;
      notification_events: Table<NotificationEvent, never, never>;
      notification_queue: Table<NotificationQueue, never, never>;
      notification_logs: Table<NotificationLog, never, never>;
      customer_profiles: Table<CustomerProfile, never, never>;
      customer_notes: Table<CustomerNote, never, never>;
      customer_tags: Table<CustomerTag, never, never>;
      customer_tag_relations: Table<CustomerTagRelation, never, never>;
      customer_activity: Table<CustomerActivity, never, never>;
      analytics_daily_metrics: Table<AnalyticsDailyMetric, never, never>;
      analytics_product_metrics: Table<AnalyticsProductMetric, never, never>;
      analytics_customer_metrics: Table<AnalyticsCustomerMetric, never, never>;
      analytics_events: Table<AnalyticsEvent, never, never>;
      return_requests: Table<ReturnRequest, never, never>;
      return_request_items: Table<ReturnRequestItem, never, never>;
      return_messages: Table<ReturnMessage, never, never>;
      return_attachments: Table<ReturnAttachment, never, never>;
      return_status_history: Table<ReturnStatusHistory, never, never>;
      loyalty_accounts: Table<LoyaltyAccount, never, never>;
      loyalty_transactions: Table<LoyaltyTransaction, never, never>;
      reward_rules: Table<RewardRule, never, never>;
      reward_redemptions: Table<RewardRedemption, never, never>;
      gift_cards: Table<GiftCard, never, never>;
      gift_card_transactions: Table<GiftCardTransaction, never, never>;
      store_credit_accounts: Table<StoreCreditAccount, never, never>;
      store_credit_transactions: Table<StoreCreditTransaction, never, never>;
      wishlist_alert_preferences: Table<
        WishlistAlertPreferenceRow,
        never,
        never
      >;
      wishlist_alert_events: Table<WishlistAlertEventRow, never, never>;
      wishlist_alert_deliveries: Table<WishlistAlertDeliveryRow, never, never>;
      product_price_history: Table<ProductPriceHistoryRow, never, never>;
      product_stock_history: Table<ProductStockHistoryRow, never, never>;
    };
    Views: {
      product_available_stock: {
        Row: { product_id: string; available_stock: number };
        Relationships: [];
      };
    };
    Functions: {
      expire_live_chat_calls: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      request_live_chat_call: {
        Args: {
          p_conversation_id: string;
          p_rate_key_hash: string;
          p_limit: number;
          p_window_seconds: number;
          p_ring_timeout_seconds: number;
          p_max_duration_seconds: number;
        };
        Returns: Json;
      };
      transition_live_chat_call: {
        Args: {
          p_call_id: string;
          p_expected_revision: number;
          p_action: string;
          p_actor_role: "customer" | "admin" | "system";
          p_actor_id?: string | null;
          p_reason?: string | null;
        };
        Returns: Json;
      };
      admin_create_payment_plan_configuration: {
        Args: {
          p_threshold_minor: number;
          p_above_threshold_down_payment_bps: number;
          p_below_threshold_down_payment_bps: number;
          p_installment_finance_charge_bps: number;
          p_installment_counts: number[];
          p_credit_card_finance_charge_bps: number;
          p_credit_card_installment_counts: number[];
        };
        Returns: Json;
      };
      activate_installment_contract_template: {
        Args: { p_template_id: string; p_actor_user_id: string };
        Returns: Json;
      };
      consume_installment_rate_limit: {
        Args: {
          p_key_hash: string;
          p_action: "draft" | "upload" | "submit";
          p_limit: number;
          p_window_seconds: number;
        };
        Returns: boolean;
      };
      admin_transition_installment_application: {
        Args: {
          p_application_id: string;
          p_expected_revision: number;
          p_action: "review" | "approve" | "reject";
          p_public_reason?: string | null;
          p_internal_note?: string | null;
        };
        Returns: Json;
      };
      submit_installment_application: {
        Args: {
          p_application_id: string;
          p_draft_token_hash: string;
          p_privacy_notice_version: string;
          p_terms_version: string;
        };
        Returns: Json;
      };
      submit_installment_application_v2: {
        Args: {
          p_application_id: string;
          p_draft_token_hash: string;
          p_privacy_notice_version: string;
          p_terms_version: string;
          p_contract_accepted: boolean;
        };
        Returns: Json;
      };
      submit_installment_application_v3: {
        Args: {
          p_application_id: string;
          p_draft_token_hash: string;
          p_privacy_notice_version: string;
          p_terms_version: string;
          p_contract_accepted: boolean;
        };
        Returns: Json;
      };
      submit_product_review: {
        Args: {
          p_product_id: string;
          p_rating: number;
          p_title: string;
          p_body: string;
        };
        Returns: string;
      };
      submit_product_review_with_images: {
        Args: {
          p_product_id: string;
          p_rating: number;
          p_title: string;
          p_body: string;
          p_image_paths?: string[];
        };
        Returns: string;
      };
      admin_create_product_review: {
        Args: {
          p_product_id: string;
          p_author_name: string;
          p_rating: number;
          p_title: string;
          p_body: string;
          p_status?: string;
        };
        Returns: string;
      };
      admin_create_product_review_with_images: {
        Args: {
          p_product_id: string;
          p_author_name: string;
          p_rating: number;
          p_title: string;
          p_body: string;
          p_image_paths?: string[];
          p_status?: string;
        };
        Returns: string;
      };
      admin_manage_product_review: {
        Args: {
          p_review_id: string;
          p_action: string;
          p_reply?: string | null;
        };
        Returns: boolean;
      };
      admin_save_product_variant_setup: {
        Args: { p_product_id: string; p_colors: Json; p_variants: Json };
        Returns: Json;
      };
      admin_delete_product: {
        Args: { p_product_id: string };
        Returns: Json;
      };
      admin_dashboard_metrics: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      earn_loyalty_points: {
        Args: {
          p_user_id: string;
          p_order_id: string;
          p_points?: number | null;
          p_reason?: string;
        };
        Returns: number;
      };
      redeem_loyalty_points: {
        Args: { p_points: number; p_order_id: string };
        Returns: number;
      };
      refund_loyalty_points: { Args: { p_order_id: string }; Returns: boolean };
      adjust_loyalty_points: {
        Args: { p_user_id: string; p_points: number; p_reason: string };
        Returns: number;
      };
      admin_save_reward_rule: { Args: { p_rule: Json }; Returns: string };
      create_gift_card: { Args: { p_payload: Json }; Returns: string };
      validate_gift_card: { Args: { p_code: string }; Returns: Json };
      redeem_gift_card: {
        Args: { p_code: string; p_order_id: string; p_amount?: number | null };
        Returns: number;
      };
      add_store_credit: {
        Args: {
          p_user_id: string;
          p_amount: number;
          p_reason: string;
          p_order_id?: string | null;
          p_return_id?: string | null;
        };
        Returns: number;
      };
      spend_store_credit: {
        Args: { p_amount: number; p_order_id: string };
        Returns: number;
      };
      refund_store_credit: {
        Args: {
          p_order_id: string;
          p_amount: number;
          p_reason?: string;
          p_return_id?: string | null;
        };
        Returns: number;
      };
      admin_update_gift_card: {
        Args: { p_card_id: string; p_action: string; p_amount?: number };
        Returns: boolean;
      };
      create_return_request: {
        Args: {
          p_order_id: string;
          p_reason: string;
          p_description: string;
          p_items: Json;
          p_request_type?: string;
        };
        Returns: string;
      };
      update_return_status: {
        Args: {
          p_return_id: string;
          p_status: string;
          p_internal_note?: string | null;
          p_customer_note?: string | null;
        };
        Returns: boolean;
      };
      add_return_message: {
        Args: {
          p_return_id: string;
          p_message: string;
          p_is_internal?: boolean;
        };
        Returns: string;
      };
      close_return_request: {
        Args: { p_return_id: string; p_note?: string | null };
        Returns: boolean;
      };
      register_return_attachment: {
        Args: {
          p_return_id: string;
          p_storage_path: string;
          p_file_name: string;
          p_mime_type: string;
          p_file_size: number;
          p_message_id?: string | null;
        };
        Returns: string;
      };
      create_order: { Args: { p_payload: Json }; Returns: Json };
      prepare_payment_receipt_upload: {
        Args: {
          p_order_number: string;
          p_contact: string;
          p_original_name: string;
          p_mime_type: string;
          p_size_bytes: number;
        };
        Returns: Json;
      };
      finalize_payment_receipt_upload: {
        Args: {
          p_order_number: string;
          p_contact: string;
          p_upload_token: string;
        };
        Returns: boolean;
      };
      admin_update_manual_payment: {
        Args: { p_order_id: string; p_action: string; p_note?: string };
        Returns: boolean;
      };
      calculate_checkout_pricing: {
        Args: { p_items: Json; p_coupon_code?: string | null };
        Returns: Json;
      };
      admin_create_coupon: { Args: { p_coupon: Json }; Returns: string };
      admin_update_coupon: {
        Args: { p_coupon_id: string; p_coupon: Json };
        Returns: boolean;
      };
      admin_delete_coupon: { Args: { p_coupon_id: string }; Returns: boolean };
      validate_coupon: {
        Args: { p_code: string; p_items: Json };
        Returns: Json;
      };
      redeem_coupon: {
        Args: { p_coupon_id: string; p_order_id: string; p_discount: number };
        Returns: string;
      };
      release_coupon: { Args: { p_order_id: string }; Returns: boolean };
      get_order_by_reference: {
        Args: { p_order_number: string; p_contact: string };
        Returns: Json;
      };
      admin_update_order: {
        Args: {
          p_order_id: string;
          p_status: string;
          p_payment_status: string;
          p_note: string;
          p_restore_stock: boolean;
        };
        Returns: boolean;
      };
      admin_hard_delete_order: {
        Args: { p_order_id: string; p_order_number: string };
        Returns: Json;
      };
      admin_set_default_payment_account: {
        Args: { p_account_id: string };
        Returns: boolean;
      };
      admin_update_payment_provider: {
        Args: {
          p_provider_id: string;
          p_is_active: boolean;
          p_mode: "sandbox" | "production";
        };
        Returns: boolean;
      };
      admin_set_payment_provider_secret: {
        Args: {
          p_provider_id: string;
          p_setting_key: string;
          p_secret: string;
          p_env_key: string;
        };
        Returns: boolean;
      };
      record_payment_webhook: {
        Args: {
          p_provider: string;
          p_external_event_id: string;
          p_event_type: string;
          p_payload_hash: string;
          p_payload_summary: Json;
          p_provider_secret: string;
        };
        Returns: string;
      };
      admin_create_payment_refund: {
        Args: {
          p_transaction_id: string;
          p_provider_id: string;
          p_amount: number;
          p_reason: string;
        };
        Returns: string;
      };
      record_payment_gateway_event: {
        Args: {
          p_event: string;
          p_provider: string;
          p_reference: string;
          p_status: string;
          p_metadata: Json;
        };
        Returns: boolean;
      };
      adjust_inventory: {
        Args: {
          p_warehouse_id: string;
          p_product_id: string;
          p_movement_type: string;
          p_quantity: number;
          p_note: string;
        };
        Returns: boolean;
      };
      set_inventory_reorder_level: {
        Args: {
          p_warehouse_id: string;
          p_product_id: string;
          p_reorder_level: number;
        };
        Returns: boolean;
      };
      set_default_warehouse: {
        Args: { p_warehouse_id: string };
        Returns: boolean;
      };
      create_manual_shipment: {
        Args: {
          p_order_id: string;
          p_carrier_id: string;
          p_items: Json;
          p_tracking_number?: string | null;
          p_estimated_delivery_at?: string | null;
          p_package?: Json;
          p_shipping_cost?: number;
          p_admin_note?: string | null;
        };
        Returns: string;
      };
      update_shipment_status: {
        Args: {
          p_shipment_id: string;
          p_status: string;
          p_description?: string | null;
          p_location?: string | null;
        };
        Returns: boolean;
      };
      update_shipment_tracking: {
        Args: {
          p_shipment_id: string;
          p_carrier_id: string;
          p_tracking_number: string;
          p_estimated_delivery_at?: string | null;
          p_admin_note?: string | null;
        };
        Returns: boolean;
      };
      add_manual_shipment_event: {
        Args: {
          p_shipment_id: string;
          p_title: string;
          p_description: string;
          p_location: string;
          p_event_time?: string | null;
        };
        Returns: boolean;
      };
      set_default_shipping_carrier: {
        Args: { p_carrier_id: string };
        Returns: boolean;
      };
      set_default_payment_partner: {
        Args: { p_partner_id: string };
        Returns: boolean;
      };
      admin_update_shipping_experience: {
        Args: {
          p_carrier_id: string;
          p_is_active: boolean;
          p_is_default: boolean;
          p_estimated_days: number;
          p_free_label: string;
          p_description: string;
          p_logo_url: string;
        };
        Returns: boolean;
      };
      admin_update_manual_shipment: {
        Args: {
          p_shipment_id: string;
          p_carrier_id: string;
          p_tracking_number: string;
          p_tracking_url: string;
          p_shipping_note: string;
          p_estimated_at: string;
          p_status: string;
        };
        Returns: boolean;
      };
      admin_update_shipping_provider: {
        Args: { p_id: string; p_active: boolean; p_environment: string };
        Returns: boolean;
      };
      admin_set_shipping_webhook_secret: {
        Args: { p_id: string; p_secret: string };
        Returns: boolean;
      };
      create_shipping_sync_job: {
        Args: {
          p_shipment_id: string;
          p_provider_key: string;
          p_job_type: string;
        };
        Returns: string;
      };
      admin_retry_shipping_job: {
        Args: { p_job_id: string };
        Returns: boolean;
      };
      admin_create_mock_shipment: {
        Args: {
          p_order_id: string;
          p_carrier_id: string;
          p_items: Json;
          p_idempotency_key: string;
          p_package?: Json;
        };
        Returns: string;
      };
      admin_cancel_provider_shipment: {
        Args: { p_shipment_id: string };
        Returns: boolean;
      };
      register_shipping_webhook: {
        Args: {
          p_provider_key: string;
          p_external_event_id: string;
          p_event_type: string;
          p_tracking_number: string;
          p_payload_hash: string;
          p_payload_summary: Json;
          p_signature_valid: boolean;
          p_provider_secret: string;
        };
        Returns: string;
      };
      complete_shipping_webhook: {
        Args: {
          p_webhook_id: string;
          p_shipment_id: string;
          p_status: string;
          p_error?: string | null;
        };
        Returns: boolean;
      };
      upsert_shipping_tracking_event: {
        Args: {
          p_shipment_id: string;
          p_external_event_id: string;
          p_status: string;
          p_raw_status: string;
          p_title: string;
          p_description: string;
          p_location: string;
          p_occurred_at: string;
          p_event_hash: string;
        };
        Returns: boolean;
      };
      write_audit_log: {
        Args: {
          p_action: string;
          p_entity_type: string;
          p_entity_id?: string | null;
          p_entity_name?: string | null;
          p_old_data?: Json | null;
          p_new_data?: Json | null;
          p_metadata?: Json;
        };
        Returns: string;
      };
      admin_save_notification_template: {
        Args: { p_template: Json };
        Returns: string;
      };
      publish_notification_event: {
        Args: {
          p_event_type: string;
          p_entity_type: string;
          p_entity_id: string;
          p_payload: Json;
        };
        Returns: string;
      };
      admin_complete_notification: {
        Args: {
          p_queue_id: string;
          p_success: boolean;
          p_provider: string;
          p_response: Json;
          p_error?: string | null;
        };
        Returns: boolean;
      };
      admin_update_customer: {
        Args: {
          p_customer_id: string;
          p_status: string;
          p_segment: string;
          p_marketing_opt_in: boolean;
        };
        Returns: boolean;
      };
      admin_add_customer_note: {
        Args: { p_customer_id: string; p_note: string; p_is_private: boolean };
        Returns: string;
      };
      admin_add_customer_tag: {
        Args: {
          p_customer_id: string;
          p_tag_name: string;
          p_color: string;
          p_description: string;
        };
        Returns: string;
      };
      admin_remove_customer_tag: {
        Args: { p_customer_id: string; p_tag_id: string };
        Returns: boolean;
      };
      admin_log_customer_activity: {
        Args: {
          p_customer_id: string;
          p_activity_type: string;
          p_description: string;
          p_metadata: Json;
        };
        Returns: string;
      };
      record_customer_login: { Args: Record<never, never>; Returns: boolean };
      refresh_analytics_daily_metrics: {
        Args: { start_date: string; end_date: string };
        Returns: number;
      };
      refresh_analytics_product_metrics: {
        Args: { start_date: string; end_date: string };
        Returns: number;
      };
      refresh_analytics_customer_metrics: {
        Args: { start_date: string; end_date: string };
        Returns: number;
      };
      set_wishlist_alert_preference: {
        Args: {
          p_product_id: string;
          p_price_drop: boolean;
          p_back_in_stock: boolean;
          p_promotion_started: boolean;
        };
        Returns: boolean;
      };
      create_wishlist_alert_event: {
        Args: {
          p_product_id: string;
          p_event_type: string;
          p_payload?: Json;
          p_idempotency_key: string;
        };
        Returns: number;
      };
      complete_wishlist_alert_delivery: {
        Args: {
          p_delivery_id: string;
          p_success: boolean;
          p_error?: string | null;
        };
        Returns: boolean;
      };
      retry_wishlist_alert_delivery: {
        Args: { p_event_id: string };
        Returns: boolean;
      };
      cancel_wishlist_alert_event: {
        Args: { p_event_id: string };
        Returns: boolean;
      };
      get_admin_wishlist_alerts: {
        Args: {
          p_query?: string;
          p_type?: string | null;
          p_status?: string | null;
          p_page?: number;
          p_page_size?: number;
        };
        Returns: Json;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
