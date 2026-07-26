import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { PaymentProviderCode } from "./constants";
import { PAYMENT_NOT_CONFIGURED, PAYMENT_SAFE_ERROR } from "./constants";
import { paymentProviderRegistry } from "./providers";
import type { CreatePaymentInput, PaymentProvider, RefundInput } from "./types";

export class PaymentService {
  private provider(code: PaymentProviderCode): PaymentProvider {
    const provider = paymentProviderRegistry.get(code);
    if (!provider) throw new Error(PAYMENT_NOT_CONFIGURED);
    return provider;
  }

  private async event(
    event: string,
    result: {
      provider: PaymentProviderCode;
      providerReference: string;
      status: string;
    },
  ) {
    const db = await createClient();
    if (db) {
      await db.rpc("record_payment_gateway_event", {
        p_event: event,
        p_provider: result.provider,
        p_reference: result.providerReference,
        p_status: result.status,
        p_metadata: {},
      });
    }
  }

  async create(code: PaymentProviderCode, input: CreatePaymentInput) {
    try {
      const result = await this.provider(code).createPayment(input);
      await this.event("payment_started", result);
      if (result.status === "failed")
        await this.event("payment_failed", result);
      return { data: result, error: null };
    } catch {
      return { data: null, error: PAYMENT_SAFE_ERROR };
    }
  }

  async verify(code: PaymentProviderCode, reference: string) {
    try {
      const result = await this.provider(code).verifyPayment(reference);
      await this.event(
        result.success ? "payment_verified" : "payment_failed",
        result,
      );
      return { data: result, error: null };
    } catch {
      return { data: null, error: PAYMENT_SAFE_ERROR };
    }
  }

  async cancel(code: PaymentProviderCode, reference: string) {
    try {
      const result = await this.provider(code).cancelPayment(reference);
      await this.event("payment_cancelled", result);
      return { data: result, error: null };
    } catch {
      return { data: null, error: PAYMENT_SAFE_ERROR };
    }
  }

  async refund(code: PaymentProviderCode, input: RefundInput) {
    try {
      const result = await this.provider(code).refundPayment(input);
      await this.event("payment_refunded", result);
      return { data: result, error: null };
    } catch {
      return { data: null, error: PAYMENT_SAFE_ERROR };
    }
  }

  async get(code: PaymentProviderCode, reference: string) {
    try {
      return {
        data: await this.provider(code).getPayment(reference),
        error: null,
      };
    } catch {
      return { data: null, error: PAYMENT_SAFE_ERROR };
    }
  }

  async health(code: PaymentProviderCode) {
    try {
      return { data: await this.provider(code).healthCheck(), error: null };
    } catch {
      return { data: null, error: PAYMENT_SAFE_ERROR };
    }
  }
}

export const paymentService = new PaymentService();
