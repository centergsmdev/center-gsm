import { ShippingGatewayError } from "../errors";
import {
  hmacSha256,
  mapProviderStatus,
  normalizeAddress,
  sha256,
  timingSafeEqual,
  validatePackage,
} from "../utils/gateway-helpers";
import type { Json } from "@/types/database";
import type {
  ProviderCreateShipmentInput,
  ShippingAddress,
  ShippingPackage,
  ShippingProvider,
  ShippingWebhookEvent,
} from "../types";

const mockEvents = [
  "accepted",
  "in_transit",
  "at_branch",
  "out_for_delivery",
  "delivered",
] as const;
export class MockShippingProvider implements ShippingProvider {
  readonly key = "mock" as const;
  async createShipment(input: ProviderCreateShipmentInput) {
    const suffix = (await sha256(input.idempotencyKey))
      .slice(0, 12)
      .toUpperCase();
    return {
      providerKey: this.key,
      externalShipmentId: `MOCK-SHP-${suffix}`,
      trackingNumber: `MCK${suffix}`,
      trackingUrl: null,
      status: "created" as const,
      rawStatus: "created",
      metadata: { scenario: "mock" },
    };
  }
  async getShipment(shipmentId: string) {
    return {
      providerKey: this.key,
      externalShipmentId: shipmentId,
      trackingNumber: shipmentId.replace("MOCK-SHP-", "MCK"),
      trackingUrl: null,
      status: "in_transit" as const,
      rawStatus: "in_transit",
      metadata: { scenario: "mock" },
    };
  }
  async cancelShipment() {
    return true;
  }
  async getTracking(shipmentId: string) {
    return this.getShipment(shipmentId);
  }
  async getTrackingEvents(shipmentId: string) {
    return mockEvents.map((status, index) => ({
      externalEventId: `${shipmentId}-${status}`,
      status,
      rawStatus: status,
      title: status.replaceAll("_", " "),
      occurredAt: new Date(
        Date.now() - (mockEvents.length - index) * 3_600_000,
      ).toISOString(),
      metadata: { mock: true },
    }));
  }
  async createLabel(shipmentId: string, format: "pdf" | "zpl" | "png" = "pdf") {
    const contentHash = await sha256(`${shipmentId}:${format}`);
    return {
      format: "html" as const,
      contentHash,
      printableHtml: `/admin/kargolar/${encodeURIComponent(shipmentId)}/etiket`,
    };
  }
  async getLabel(shipmentId: string) {
    return this.createLabel(shipmentId);
  }
  async calculateRate(packages: ShippingPackage[], address: ShippingAddress) {
    normalizeAddress(address);
    const desi = packages
      .map((item) => validatePackage(item))
      .reduce(
        (sum, item) => sum + Math.max(item.desi, item.weightKg) * item.quantity,
        0,
      );
    return {
      amount: Math.round((79.9 + desi * 8.5) * 100) / 100,
      currency: "TRY" as const,
      estimatedDeliveryMin: 1,
      estimatedDeliveryMax: 3,
      expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
    };
  }
  async validateAddress(address: ShippingAddress) {
    return { valid: true, normalized: normalizeAddress(address), warnings: [] };
  }
  async parseWebhook(
    rawBody: string,
    contentType: string,
  ): Promise<ShippingWebhookEvent> {
    if (!contentType.includes("json"))
      throw new ShippingGatewayError("operation_failed");
    let value: unknown;
    try {
      value = JSON.parse(rawBody);
    } catch {
      throw new ShippingGatewayError("operation_failed");
    }
    if (!value || Array.isArray(value) || typeof value !== "object")
      throw new ShippingGatewayError("operation_failed");
    const payload = value as Record<string, Json | undefined>;
    const id = String(payload.id ?? ""),
      rawStatus = String(payload.status ?? "");
    if (!id || !rawStatus) throw new ShippingGatewayError("operation_failed");
    return {
      id,
      type: String(payload.type ?? "tracking.updated"),
      trackingNumber: String(payload.tracking_number ?? ""),
      externalShipmentId: String(payload.shipment_id ?? ""),
      status: mapProviderStatus(rawStatus),
      rawStatus,
      occurredAt: String(payload.occurred_at ?? new Date().toISOString()),
      payloadSummary: {
        status: rawStatus,
        tracking_number: String(payload.tracking_number ?? ""),
      },
    };
  }
  async verifyWebhook(rawBody: string, signature: string, secret: string) {
    return timingSafeEqual(await hmacSha256(rawBody, secret), signature);
  }
  async healthCheck() {
    return { healthy: true, latencyMs: 1, message: "Mock sağlayıcı hazır" };
  }
}
