import "server-only";
import { createClient } from "@/lib/supabase/server";
import { shippingProviderRegistry } from "../providers/provider-registry";
import {
  SHIPPING_WEBHOOK_MAX_BYTES,
  assertSafeXml,
  sha256,
} from "../utils/gateway-helpers";
import type { ShippingProviderKey } from "../types";

const secretFor = (provider: ShippingProviderKey) =>
  process.env[`SHIPPING_${provider.toUpperCase()}_WEBHOOK_SECRET`];
export async function processShippingWebhook(
  providerKey: ShippingProviderKey,
  rawBody: string,
  signature: string,
  contentType: string,
) {
  if (new TextEncoder().encode(rawBody).byteLength > SHIPPING_WEBHOOK_MAX_BYTES)
    return { data: null, error: "Webhook verisi çok büyük.", status: 413 };
  if (!contentType.includes("json") && !contentType.includes("xml"))
    return { data: null, error: "Desteklenmeyen içerik türü.", status: 415 };
  const provider = shippingProviderRegistry.get(providerKey),
    secret = secretFor(providerKey);
  if (!provider || !secret)
    return {
      data: null,
      error: "Kargo sağlayıcısı yapılandırılmamış.",
      status: 503,
    };
  try {
    if (contentType.includes("xml")) assertSafeXml(rawBody);
    if (!(await provider.verifyWebhook(rawBody, signature, secret)))
      return { data: null, error: "Webhook doğrulanamadı.", status: 401 };
    const event = await provider.parseWebhook(rawBody, contentType);
    const db = await createClient();
    if (!db)
      return { data: null, error: "Servis kullanılamıyor.", status: 503 };
    const registered = await db.rpc("register_shipping_webhook", {
      p_provider_key: providerKey,
      p_external_event_id: event.id,
      p_event_type: event.type,
      p_tracking_number: event.trackingNumber ?? "",
      p_payload_hash: await sha256(rawBody),
      p_payload_summary: event.payloadSummary,
      p_signature_valid: true,
      p_provider_secret: secret,
    });
    if (registered.error)
      return {
        data: null,
        error: registered.error.message.includes("replayed")
          ? "Webhook daha önce işlendi."
          : "Webhook işlenemedi.",
        status: registered.error.message.includes("replayed") ? 200 : 400,
      };
    return { data: { id: registered.data }, error: null, status: 202 };
  } catch {
    return { data: null, error: "Webhook işlenemedi.", status: 400 };
  }
}
