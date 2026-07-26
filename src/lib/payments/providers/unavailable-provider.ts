import { PaymentGatewayError } from "../errors";
import type {
  CreatePaymentInput,
  PaymentProvider,
  RefundInput,
} from "../types";
import type { PaymentProviderCode } from "../constants";
export class UnavailablePaymentProvider implements PaymentProvider {
  constructor(readonly code: Exclude<PaymentProviderCode, "mock">) {}
  private fail(): never {
    throw new PaymentGatewayError(
      "NOT_CONFIGURED",
      `${this.code} sağlayıcısı yapılandırılmamış.`,
    );
  }
  async createPayment(_input: CreatePaymentInput) {
    void _input;
    return this.fail();
  }
  async verifyPayment(_reference: string) {
    void _reference;
    return this.fail();
  }
  async cancelPayment(_reference: string) {
    void _reference;
    return this.fail();
  }
  async refundPayment(_input: RefundInput) {
    void _input;
    return this.fail();
  }
  async getPayment(_reference: string) {
    void _reference;
    return this.fail();
  }
  async parseWebhook(_body: string, _signature: string, _secret: string) {
    void _body;
    void _signature;
    void _secret;
    return this.fail();
  }
  async healthCheck() {
    return { healthy: false, latencyMs: 0, message: "Yapılandırılmamış" };
  }
}
