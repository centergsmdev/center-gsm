import { unstable_noStore as noStore } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { WhatsAppRepresentative } from "@/types/database";

export async function getActiveWhatsAppRepresentatives(): Promise<
  WhatsAppRepresentative[]
> {
  noStore();
  const client = await createClient();
  if (!client) return [];

  const result = await client
    .from("whatsapp_representatives")
    .select("*")
    .eq("is_active", true)
    .order("sort_order")
    .order("created_at")
    .order("id");

  return result.data ?? [];
}
