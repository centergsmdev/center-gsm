import { ShippingGatewayError } from "../errors";
import { normalizeAddress } from "../utils/gateway-helpers";
import type {
  AddressValidationResult,
  ProviderCreateShipmentInput,
  ProviderShipment,
  ShippingAddress,
  ShippingLabelResult,
  ShippingPackage,
  ShippingProvider,
  ShippingRateResult,
  ShippingWebhookEvent,
} from "../types";

export class ManualShippingProvider implements ShippingProvider {
  readonly key = "manual" as const;
  async createShipment(
    input: ProviderCreateShipmentInput,
  ): Promise<ProviderShipment> {
    return {
      providerKey: this.key,
      externalShipmentId: `manual-${input.idempotencyKey}`,
      trackingNumber: null,
      trackingUrl: null,
      status: "created" as const,
      metadata: { mode: "manual" },
    };
  }
  async cancelShipment() {
    return true;
  }
  async getShipment() {
    return null;
  }
  async getTracking() {
    return null;
  }
  async getTrackingEvents() {
    return [];
  }
  async createLabel(): Promise<ShippingLabelResult> {
    throw new ShippingGatewayError("label_unavailable");
  }
  async getLabel(shipmentId: string) {
    return {
      format: "html" as const,
      contentHash: shipmentId,
      printableHtml: `/admin/kargolar/${encodeURIComponent(shipmentId)}/etiket`,
    };
  }
  async calculateRate(
    _packages: ShippingPackage[],
    _address: ShippingAddress,
  ): Promise<ShippingRateResult> {
    void _packages;
    void _address;
    throw new ShippingGatewayError("provider_not_configured");
  }
  async validateAddress(
    address: ShippingAddress,
  ): Promise<AddressValidationResult> {
    return { valid: true, normalized: normalizeAddress(address), warnings: [] };
  }
  async parseWebhook(): Promise<ShippingWebhookEvent> {
    throw new ShippingGatewayError("provider_not_configured");
  }
  async verifyWebhook() {
    return false;
  }
  async healthCheck() {
    return { healthy: true, latencyMs: 0, message: "Manuel sağlayıcı hazır" };
  }
}
