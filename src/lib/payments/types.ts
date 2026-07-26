import type { Json, Tables } from "@/types/database";
import type { PaymentProviderCode } from "./constants";
export type GatewayStatus =
  "pending" | "succeeded" | "failed" | "cancelled" | "refunded";
export type PaymentScenario = "success" | "failure" | "pending";
export type CreatePaymentInput = {
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: "TRY";
  idempotencyKey: string;
  scenario?: PaymentScenario;
  metadata?: Json;
};
export type PaymentResult = {
  success: boolean;
  status: GatewayStatus;
  provider: PaymentProviderCode;
  providerReference: string;
  message?: string;
  raw?: Json;
};
export type RefundInput = {
  providerReference: string;
  amount: number;
  reason?: string;
};
export type WebhookEvent = {
  id: string;
  type: string;
  providerReference: string;
  status: GatewayStatus;
  payloadSummary: Json;
};
export type ProviderHealth = {
  healthy: boolean;
  latencyMs: number;
  message: string;
};
export interface PaymentProvider {
  readonly code: PaymentProviderCode;
  createPayment(input: CreatePaymentInput): Promise<PaymentResult>;
  verifyPayment(reference: string): Promise<PaymentResult>;
  cancelPayment(reference: string): Promise<PaymentResult>;
  refundPayment(input: RefundInput): Promise<PaymentResult>;
  getPayment(reference: string): Promise<PaymentResult>;
  parseWebhook(
    rawBody: string,
    signature: string,
    secret: string,
  ): Promise<WebhookEvent>;
  healthCheck(): Promise<ProviderHealth>;
}
export type PaymentProviderRow = Tables<"payment_providers">;
export type PaymentWebhookRow = Tables<"payment_webhooks">;
export type PaymentRefundRow = Tables<"payment_refunds">;
export type PaymentResultEnvelope<T> = { data: T | null; error: string | null };
