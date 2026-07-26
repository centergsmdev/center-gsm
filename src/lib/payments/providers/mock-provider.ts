import { hmacSha256, parseWebhookJson, timingSafeEqual } from "../helpers";
import { mapGatewayResult } from "../mapper";
import { PaymentGatewayError } from "../errors";
import type {
  CreatePaymentInput,
  PaymentProvider,
  RefundInput,
  WebhookEvent,
} from "../types";
export class MockPaymentProvider implements PaymentProvider {
  readonly code = "mock";
  private result(
    reference: string,
    scenario: "success" | "failure" | "pending" = "success",
  ) {
    return mapGatewayResult(
      this.code,
      reference,
      scenario === "success"
        ? "succeeded"
        : scenario === "failure"
          ? "failed"
          : "pending",
      `Mock ${scenario}`,
    );
  }
  async createPayment(input: CreatePaymentInput) {
    return this.result(`mock-${input.idempotencyKey}`, input.scenario);
  }
  async verifyPayment(reference: string) {
    return this.result(reference);
  }
  async cancelPayment(reference: string) {
    return mapGatewayResult(this.code, reference, "cancelled");
  }
  async refundPayment(input: RefundInput) {
    return mapGatewayResult(
      this.code,
      `${input.providerReference}-refund`,
      "refunded",
    );
  }
  async getPayment(reference: string) {
    return this.result(reference);
  }
  async parseWebhook(
    rawBody: string,
    signature: string,
    secret: string,
  ): Promise<WebhookEvent> {
    const expected = await hmacSha256(rawBody, secret);
    if (!timingSafeEqual(expected, signature))
      throw new PaymentGatewayError(
        "INVALID_SIGNATURE",
        "Webhook imzası geçersiz.",
      );
    const payload = parseWebhookJson(rawBody);
    const id = String(payload.id ?? "");
    const type = String(payload.type ?? "");
    if (!id || !type)
      throw new PaymentGatewayError(
        "INVALID_PAYLOAD",
        "Webhook alanları eksik.",
      );
    return {
      id,
      type,
      providerReference: String(payload.reference ?? id),
      status: String(payload.status ?? "pending") as WebhookEvent["status"],
      payloadSummary: {
        reference: String(payload.reference ?? id),
        status: String(payload.status ?? "pending"),
      },
    };
  }
  async healthCheck() {
    return { healthy: true, latencyMs: 1, message: "Mock provider hazır" };
  }
}
