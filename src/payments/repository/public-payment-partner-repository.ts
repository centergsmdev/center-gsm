import "server-only";

import { createClient } from "@/lib/supabase/server";

export type PublicPaymentPartner = {
  id: string;
  name: string;
  logoUrl: string | null;
};

export async function getPublicPaymentPartners(): Promise<
  PublicPaymentPartner[]
> {
  const client = await createClient();
  if (!client) return [];

  const result = await client
    .from("payment_partners")
    .select("id,name,logo_url")
    .eq("is_active", true)
    .order("is_default", { ascending: false })
    .order("sort_order")
    .order("name");

  if (result.error) return [];

  return result.data.map((partner) => ({
    id: partner.id,
    name: partner.name,
    logoUrl: partner.logo_url?.trim() || null,
  }));
}
