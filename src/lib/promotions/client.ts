import { createClient } from "@/lib/supabase/client";
import type { PromotionQuote } from "@/types/cart";
import type { Json } from "@/types/database";

const safeError =
  "Kupon doğrulanamadı. Kodunuzu ve sepet koşullarını kontrol edin.";
const record = (value: Json): Record<string, Json | undefined> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? value : null;

export async function calculateCheckoutPricing(
  items: { sku: string; quantity: number; variant_id?: string }[],
  couponCode?: string | null,
): Promise<{ data: PromotionQuote | null; error: string | null }> {
  const client = createClient();
  if (!client)
    return couponCode
      ? { data: null, error: "Kupon servisi yapılandırılmamış." }
      : {
          data: { subtotal: 0, campaignDiscount: 0, couponDiscount: 0 },
          error: null,
        };
  const normalizedCode = couponCode?.trim().toUpperCase() || null;
  const result = normalizedCode
    ? await client.rpc("validate_coupon", {
        p_code: normalizedCode,
        p_items: items as unknown as Json,
      })
    : await client.rpc("calculate_checkout_pricing", {
        p_items: items as unknown as Json,
        p_coupon_code: null,
      });
  const value = record(result.data);
  if (result.error || !value || value.valid === false)
    return { data: null, error: safeError };
  if (
    typeof value.subtotal !== "number" ||
    typeof value.campaign_discount !== "number" ||
    typeof value.coupon_discount !== "number"
  )
    return { data: null, error: safeError };
  return {
    data: {
      subtotal: value.subtotal,
      campaignDiscount: value.campaign_discount,
      couponDiscount: value.coupon_discount,
      freeShipping: value.free_shipping === true,
    },
    error: null,
  };
}
