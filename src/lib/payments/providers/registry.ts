import type { PaymentProviderCode } from "../constants";
import type { PaymentProvider } from "../types";
import { MockPaymentProvider } from "./mock-provider";
import { UnavailablePaymentProvider } from "./unavailable-provider";
export class PaymentProviderRegistry {
  private readonly providers = new Map<PaymentProviderCode, PaymentProvider>();
  register(provider: PaymentProvider) {
    this.providers.set(provider.code, provider);
    return this;
  }
  get(code: PaymentProviderCode) {
    return this.providers.get(code) ?? null;
  }
}
export const paymentProviderRegistry = new PaymentProviderRegistry()
  .register(new MockPaymentProvider())
  .register(new UnavailablePaymentProvider("iyzico"))
  .register(new UnavailablePaymentProvider("paytr"))
  .register(new UnavailablePaymentProvider("param"));
