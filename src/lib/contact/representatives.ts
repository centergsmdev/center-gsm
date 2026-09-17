import { unstable_cache } from "next/cache";

import { CACHE_TAGS } from "@/lib/performance/constants";
import { createPublicClient } from "@/lib/supabase/public";
import type { WhatsAppRepresentative } from "@/types/database";

const getCachedRepresentatives = unstable_cache(async (): Promise<
  WhatsAppRepresentative[]
> => {
  const client = createPublicClient();
  if (!client) return [];

  const result = await client
    .from("whatsapp_representatives")
    .select("*")
    .eq("is_active", true)
    .order("sort_order")
    .order("created_at")
    .order("id");

  return result.data ?? [];
}, ["public-whatsapp-representatives"], { revalidate: 300, tags: [CACHE_TAGS.settings] });

export async function getActiveWhatsAppRepresentatives() {
  return getCachedRepresentatives();
}
