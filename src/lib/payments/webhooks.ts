import "server-only";
import { createClient } from "@/lib/supabase/server";
import { PAYMENT_SAFE_ERROR, PAYMENT_WEBHOOK_MAX_BYTES } from "./constants";
import { paymentProviderRegistry } from "./providers";
import { sha256 } from "./helpers";
import type { PaymentProviderCode } from "./constants";
const secretFor = (provider: PaymentProviderCode) =>
  process.env[`PAYMENT_${provider.toUpperCase()}_WEBHOOK_SECRET`];
export async function processPaymentWebhook(
  providerCode: PaymentProviderCode,
  rawBody: string,
  signature: string,
) {
  if (new TextEncoder().encode(rawBody).byteLength > PAYMENT_WEBHOOK_MAX_BYTES)
    return { data: null, error: "Webhook verisi çok büyük.", status: 413 };
  const provider = paymentProviderRegistry.get(providerCode),
    secret = secretFor(providerCode);
  if (!provider || !secret)
    return {
      data: null,
      error: "Ödeme sağlayıcısı yapılandırılmamış.",
      status: 503,
    };
  try {
    const event = await provider.parseWebhook(rawBody, signature, secret);
    const db = await createClient();
    if (!db) return { data: null, error: PAYMENT_SAFE_ERROR, status: 503 };
    const result = await db.rpc("record_payment_webhook", {
      p_provider: providerCode,
      p_external_event_id: event.id,
      p_event_type: event.type,
      p_payload_hash: await sha256(rawBody),
      p_payload_summary: event.payloadSummary,
      p_provider_secret: secret,
    });
    return result.error
      ? { data: null, error: PAYMENT_SAFE_ERROR, status: 400 }
      : { data: { id: result.data }, error: null, status: 200 };
  } catch {
    return { data: null, error: "Webhook doğrulanamadı.", status: 401 };
  }
}
