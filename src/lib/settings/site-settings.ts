import { unstable_noStore as noStore } from "next/cache";

import { createPublicClient } from "@/lib/supabase/public";
import type { SiteSettings } from "@/types/database";

export const defaultSiteSettings: SiteSettings = {
  id: true,
  company_name: "CENTER GSM Teknoloji A.Ş.",
  tax_number: null,
  logo_url: null,
  contact_email: null,
  phone: null,
  address: null,
  instagram_url: null,
  youtube_url: null,
  twitter_url: null,
  free_shipping_limit: 2500,
  same_day_shipping_enabled: true,
  phone_approval_enabled: true,
  bank_transfer_enabled: true,
  updated_at: "",
  updated_by: null,
};

export async function getSiteSettings() {
  noStore();
  const client = createPublicClient();
  if (!client) return defaultSiteSettings;
  const { data } = await client
    .from("site_settings")
    .select("*")
    .eq("id", true)
    .maybeSingle();
  return data ?? defaultSiteSettings;
}
