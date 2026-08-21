import { unstable_noStore as noStore } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { FaqItem } from "@/types/database";

export async function getPublishedFaqs(): Promise<FaqItem[]> {
  noStore();
  const client = await createClient();
  if (!client) return [];
  const result = await client
    .from("faq_items")
    .select("*")
    .eq("is_published", true)
    .order("sort_order")
    .order("created_at");
  return result.error ? [] : result.data;
}
