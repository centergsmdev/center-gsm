import "server-only";

import { createClient } from "@/lib/supabase/server";

export type PublicShippingCarrier = {
  id: string;
  name: string;
  providerKey: string;
  logoUrl: string | null;
};

const INTERNAL_SHIPPING_PROVIDERS = new Set(["manual", "mock"]);

export async function getPublicShippingCarriers(): Promise<
  PublicShippingCarrier[]
> {
  const client = await createClient();
  if (!client) return [];

  const result = await client
    .from("shipping_carriers")
    .select("id,name,provider_key,logo_url")
    .eq("is_active", true)
    .order("name");

  if (result.error) {
    console.error("Active shipping carriers could not be loaded", {
      code: result.error.code,
      message: result.error.message,
      details: result.error.details,
      hint: result.error.hint,
    });
    return [];
  }

  return result.data
    .filter(
      (carrier) =>
        !INTERNAL_SHIPPING_PROVIDERS.has(carrier.provider_key.toLowerCase()),
    )
    .map((carrier) => ({
      id: carrier.id,
      name: carrier.name,
      providerKey: carrier.provider_key,
      logoUrl: carrier.logo_url?.trim() || null,
    }));
}
