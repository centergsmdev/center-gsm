import { ShippingGatewayError } from "../errors";
import type {
  ProviderCreateShipmentInput,
  ShippingAddress,
  ShippingPackage,
  ShippingProvider,
  ShippingProviderKey,
} from "../types";
export class UnavailableShippingProvider implements ShippingProvider {
  constructor(readonly key: Exclude<ShippingProviderKey, "manual" | "mock">) {}
  private fail(): never {
    throw new ShippingGatewayError("provider_not_configured");
  }
  async createShipment(input: ProviderCreateShipmentInput) {
    void input;
    return this.fail();
  }
  async getShipment(id: string) {
    void id;
    return this.fail();
  }
  async cancelShipment(id: string) {
    void id;
    return this.fail();
  }
  async getTracking(id: string) {
    void id;
    return this.fail();
  }
  async getTrackingEvents(id: string) {
    void id;
    return this.fail();
  }
  async createLabel(id: string) {
    void id;
    return this.fail();
  }
  async getLabel(id: string) {
    void id;
    return this.fail();
  }
  async calculateRate(packages: ShippingPackage[], address: ShippingAddress) {
    void packages;
    void address;
    return this.fail();
  }
  async validateAddress(address: ShippingAddress) {
    void address;
    return this.fail();
  }
  async parseWebhook(body: string, type: string) {
    void body;
    void type;
    return this.fail();
  }
  async verifyWebhook(body: string, signature: string, secret: string) {
    void body;
    void signature;
    void secret;
    return false;
  }
  async healthCheck() {
    return {
      healthy: false,
      latencyMs: 0,
      message: "Sağlayıcı yapılandırılmamış",
    };
  }
}
