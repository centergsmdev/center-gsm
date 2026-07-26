import "server-only";
import { shippingProviderRegistry } from "../providers/provider-registry";
import { ShippingGatewayError } from "../errors";
import {
  normalizeAddress,
  validatePackage,
  withTimeout,
} from "../utils/gateway-helpers";
import type {
  ProviderCreateShipmentInput,
  ShippingAddress,
  ShippingPackage,
  ShippingProviderKey,
} from "../types";

export class ShippingGatewayService {
  private provider(key: ShippingProviderKey) {
    const provider = shippingProviderRegistry.get(key);
    if (!provider) throw new ShippingGatewayError("provider_not_configured");
    return provider;
  }
  async createProviderShipment(
    key: ShippingProviderKey,
    input: ProviderCreateShipmentInput,
  ) {
    if (!input.idempotencyKey)
      throw new ShippingGatewayError("shipment_already_exists");
    return withTimeout(
      this.provider(key).createShipment({
        ...input,
        address: normalizeAddress(input.address),
        packages: input.packages.map((item) => validatePackage(item)),
      }),
    );
  }
  async cancelProviderShipment(key: ShippingProviderKey, externalId: string) {
    return withTimeout(this.provider(key).cancelShipment(externalId));
  }
  async refreshTracking(key: ShippingProviderKey, externalId: string) {
    return withTimeout(this.provider(key).getTracking(externalId));
  }
  async refreshTrackingEvents(key: ShippingProviderKey, externalId: string) {
    return withTimeout(this.provider(key).getTrackingEvents(externalId));
  }
  async createShippingLabel(
    key: ShippingProviderKey,
    externalId: string,
    format: "pdf" | "zpl" | "png" = "pdf",
  ) {
    return withTimeout(this.provider(key).createLabel(externalId, format));
  }
  async getShippingLabel(key: ShippingProviderKey, externalId: string) {
    return withTimeout(this.provider(key).getLabel(externalId));
  }
  async calculateShippingRate(
    key: ShippingProviderKey,
    packages: ShippingPackage[],
    address: ShippingAddress,
  ) {
    return withTimeout(
      this.provider(key).calculateRate(
        packages.map((item) => validatePackage(item)),
        normalizeAddress(address),
      ),
    );
  }
  async validateShippingAddress(
    key: ShippingProviderKey,
    address: ShippingAddress,
  ) {
    return this.provider(key).validateAddress(normalizeAddress(address));
  }
  async checkProviderHealth(key: ShippingProviderKey) {
    return withTimeout(this.provider(key).healthCheck(), 5_000);
  }
  async retryShippingOperation<T>(operation: () => Promise<T>, attempts = 3) {
    let last: unknown;
    for (let attempt = 0; attempt < Math.min(attempts, 3); attempt += 1) {
      try {
        return await operation();
      } catch (error) {
        last = error;
        if (attempt < attempts - 1)
          await new Promise((resolve) =>
            setTimeout(resolve, 2 ** attempt * 150),
          );
      }
    }
    throw last;
  }
}
export const shippingGatewayService = new ShippingGatewayService();
