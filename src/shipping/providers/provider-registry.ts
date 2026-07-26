import { ManualShippingProvider } from "./manual-shipping-provider";
import { MockShippingProvider } from "./mock-shipping-provider";
import { UnavailableShippingProvider } from "./unavailable-shipping-provider";
import type { ShippingProvider, ShippingProviderKey } from "../types";

export class ShippingProviderRegistry {
  private readonly providers = new Map<ShippingProviderKey, ShippingProvider>();
  constructor() {
    this.register(new ManualShippingProvider());
    this.register(new MockShippingProvider());
    for (const key of [
      "yurtici",
      "aras",
      "mng",
      "surat",
      "ptt",
      "hepsijet",
    ] as const)
      this.register(new UnavailableShippingProvider(key));
  }
  register(provider: ShippingProvider) {
    this.providers.set(provider.key, provider);
  }
  get(key: ShippingProviderKey) {
    return this.providers.get(key);
  }
  require(key: ShippingProviderKey) {
    const provider = this.get(key);
    if (!provider) throw new Error("provider_not_configured");
    return provider;
  }
}
export const shippingProviderRegistry = new ShippingProviderRegistry();
