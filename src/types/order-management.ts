import type { Json, Tables } from "@/types/database";

export type OrderStatus =
  "received" | "preparing" | "shipped" | "delivered" | "cancelled";
export type OrderPaymentStatus =
  | "pending"
  | "awaiting_payment"
  | "awaiting_phone_approval"
  | "customer_unreachable"
  | "paid"
  | "failed"
  | "cancelled"
  | "refunded";
export type OrderHistoryEntry = {
  status: OrderStatus;
  label: string;
  at: string;
};
export type OrderAddress = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  city: string;
  district: string;
  neighborhood: string;
  address: string;
  postalCode: string;
  addressTitle: string;
};
export type BillingAddress = Record<string, Json | undefined>;
export type OrderCreatePayload = {
  delivery_address: OrderAddress;
  billing_address: BillingAddress;
  delivery_method: string;
  payment_method: string;
  coupon_code: string | null;
  selected_shipping_provider: string;
  shipping_note: string;
  items: { sku: string; quantity: number; image_url?: string }[];
  loyalty_points?: number;
  gift_card_code?: string;
  gift_card_amount?: number;
  store_credit_amount?: number;
};
export type CreatedOrder = {
  id: string;
  orderNumber: string;
  grandTotal: number;
  createdAt: string;
  contact: string;
  subtotal: number;
  discountTotal: number;
  campaignDiscount: number;
  couponDiscount: number;
  loyaltyDiscount?: number;
  loyaltyPointsRedeemed?: number;
  giftCardAmount?: number;
  storeCreditAmount?: number;
};
export type OrderDetail = {
  order: Tables<"orders">;
  items: Tables<"order_items">[];
  shipments?: (Tables<"shipments"> & {
    items: (Tables<"shipment_items"> & { product_name?: string })[];
    events: Tables<"shipment_events">[];
  })[];
};
export type AdminOrder = Tables<"orders"> & {
  customerName: string;
  email: string;
  itemCount: number;
};
