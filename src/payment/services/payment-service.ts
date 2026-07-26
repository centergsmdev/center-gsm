import { getPaymentProvider } from "@/payment/providers/provider-registry";
import type { PaymentProviderId, PaymentRequest } from "@/payment/types";
export class PaymentService {
  async initialize(providerId: PaymentProviderId, request: PaymentRequest) { const provider = getPaymentProvider(providerId); if (!provider) return { success: false, status: "failed" as const, provider: providerId, message: "Ödeme sağlayıcısı kullanılamıyor." }; return provider.initialize(request); }
  async verify(providerId: PaymentProviderId, reference: string) { const provider = getPaymentProvider(providerId); return provider ? provider.verify(reference) : null; }
  async cancel(providerId: PaymentProviderId, reference: string) { const provider = getPaymentProvider(providerId); return provider ? provider.cancel(reference) : null; }
  async refund(providerId: PaymentProviderId, reference: string, amount?: number) { const provider = getPaymentProvider(providerId); return provider ? provider.refund(reference, amount) : null; }
}
