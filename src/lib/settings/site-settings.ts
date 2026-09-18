import { unstable_cache } from "next/cache";

import { CACHE_TAGS } from "@/lib/performance/constants";
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
  installment_landing_video_url: null,
  free_shipping_limit: 2500,
  same_day_shipping_enabled: true,
  phone_approval_enabled: true,
  bank_transfer_enabled: true,
  updated_at: "",
  updated_by: null,
};

const getCachedSiteSettings = unstable_cache(
  async () => {
    const client = createPublicClient();
    if (!client) return defaultSiteSettings;
    const { data } = await client
      .from("site_settings")
      .select("*")
      .eq("id", true)
      .maybeSingle();
    return data ?? defaultSiteSettings;
  },
  ["public-site-settings"],
  { revalidate: 300, tags: [CACHE_TAGS.settings] },
);

export async function getSiteSettings() {
  return getCachedSiteSettings();
}
