import type { Json, Tables } from "@/types/database";

export const SHIPPING_PROVIDER_KEYS = [
  "manual",
  "mock",
  "yurtici",
  "aras",
  "mng",
  "surat",
  "ptt",
  "hepsijet",
] as const;
export type ShippingProviderKey = (typeof SHIPPING_PROVIDER_KEYS)[number];
export type ShippingStatus = Tables<"shipments">["status"];
export type ShippingMethod =
  "standard" | "express" | "store_pickup" | "same_day";
export type GatewayShipmentStatus =
  | "pending"
  | "created"
  | "label_created"
  | "accepted"
  | "in_transit"
  | "at_branch"
  | "out_for_delivery"
  | "delivered"
  | "delivery_failed"
  | "return_started"
  | "returned"
  | "cancelled"
  | "exception";
export type ShippingErrorCode =
  | "provider_not_configured"
  | "provider_unavailable"
  | "invalid_address"
  | "invalid_package"
  | "shipment_already_exists"
  | "shipment_not_found"
  | "tracking_unavailable"
  | "label_unavailable"
  | "invalid_webhook_signature"
  | "webhook_replayed"
  | "rate_limit_exceeded"
  | "provider_timeout"
  | "operation_failed";

export type ShippingPackage = {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  weightKg: number;
  desi: number;
  quantity: number;
};
export type ShipmentPackage = {
  packageCount?: number;
  weight?: number;
  desi?: number;
  width?: number;
  length?: number;
  height?: number;
  note?: string;
};
export type ShippingAddress = {
  fullName: string;
  phone: string;
  countryCode: string;
  city: string;
  district: string;
  neighborhood?: string;
  addressLine: string;
  postalCode?: string;
};
export type CreateShipmentInput = {
  orderId: string;
  carrierId: string;
  items: { orderItemId: string; quantity: number }[];
  trackingNumber?: string;
  estimatedDeliveryAt?: string;
  package: ShipmentPackage;
  shippingCost: number;
  adminNote?: string;
};
export type ProviderCreateShipmentInput = {
  orderId: string;
  orderNumber: string;
  idempotencyKey: string;
  address: ShippingAddress;
  packages: ShippingPackage[];
  metadata?: Json;
};
export type ProviderShipment = {
  providerKey: ShippingProviderKey;
  externalShipmentId?: string;
  trackingNumber: string | null;
  trackingUrl: string | null;
  status?: GatewayShipmentStatus;
  rawStatus?: string;
  metadata: Json;
};
export type ProviderTrackingEvent = {
  externalEventId: string;
  status: GatewayShipmentStatus;
  rawStatus: string;
  title: string;
  description?: string;
  location?: string;
  occurredAt: string;
  metadata: Json;
};
export type ShippingLabelResult = {
  format: "pdf" | "zpl" | "png" | "html";
  contentHash: string;
  storagePath?: string;
  printableHtml?: string;
};
export type ShippingRateResult = {
  amount: number;
  currency: "TRY";
  estimatedDeliveryMin: number;
  estimatedDeliveryMax: number;
  expiresAt: string;
};
export type AddressValidationResult = {
  valid: boolean;
  normalized: ShippingAddress;
  warnings: string[];
};
export type ShippingWebhookEvent = {
  id: string;
  type: string;
  trackingNumber?: string;
  externalShipmentId?: string;
  status: GatewayShipmentStatus;
  rawStatus: string;
  occurredAt: string;
  payloadSummary: Json;
};
export type ProviderHealth = {
  healthy: boolean;
  latencyMs: number;
  message: string;
};

export interface ShippingProvider {
  readonly key: ShippingProviderKey;
  createShipment(input: ProviderCreateShipmentInput): Promise<ProviderShipment>;
  getShipment(shipmentId: string): Promise<ProviderShipment | null>;
  cancelShipment(shipmentId: string): Promise<boolean>;
  getTracking(shipmentId: string): Promise<ProviderShipment | null>;
  getTrackingEvents(shipmentId: string): Promise<ProviderTrackingEvent[]>;
  createLabel(
    shipmentId: string,
    format?: "pdf" | "zpl" | "png",
  ): Promise<ShippingLabelResult>;
  getLabel(shipmentId: string): Promise<ShippingLabelResult | null>;
  calculateRate(
    packages: ShippingPackage[],
    address: ShippingAddress,
  ): Promise<ShippingRateResult>;
  validateAddress(address: ShippingAddress): Promise<AddressValidationResult>;
  parseWebhook(
    rawBody: string,
    contentType: string,
  ): Promise<ShippingWebhookEvent>;
  verifyWebhook(
    rawBody: string,
    signature: string,
    secret: string,
  ): Promise<boolean>;
  healthCheck(): Promise<ProviderHealth>;
}

export const SHIPPING_STATUS_LABELS: Record<ShippingStatus, string> = {
  pending: "Bekliyor",
  preparing: "Hazırlanıyor",
  ready_for_shipment: "Gönderime hazır",
  shipped: "Kargoya verildi",
  in_transit: "Transfer sürecinde",
  out_for_delivery: "Dağıtıma çıktı",
  delivered: "Teslim edildi",
  delivery_failed: "Teslim edilemedi",
  return_started: "İade sürecinde",
  returned: "İade edildi",
  cancelled: "İptal edildi",
};
export const safeTrackingUrl = (
  template: string | null,
  trackingNumber: string | null,
) =>
  !template ||
  !trackingNumber ||
  !template.startsWith("https://") ||
  !template.includes("{trackingNumber}")
    ? null
    : template.replace(
        "{trackingNumber}",
        encodeURIComponent(trackingNumber.trim()),
      );
