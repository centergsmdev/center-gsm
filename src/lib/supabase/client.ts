import { createBrowserClient } from "@supabase/ssr";

import { getSupabasePublicConfig } from "@/lib/supabase/config";
import type { Database } from "@/types/database";

export function createClient() {
  const config = getSupabasePublicConfig();
  if (!config) return null;
  console.log("[Supabase] createClient() URL", config.url);
  return createBrowserClient<Database>(config.url, config.anonKey);
}
