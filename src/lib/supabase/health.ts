import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

export type SupabaseHealthResult = {
  status: "connected" | "not-configured" | "error";
  message: string;
};

export async function checkSupabaseConnection(
  client: SupabaseClient<Database> | null,
): Promise<SupabaseHealthResult> {
  if (!client)
    return {
      status: "not-configured",
      message: "Supabase environment variables are not configured.",
    };
  try {
    const { error } = await client.from("categories").select("id").limit(1);
    if (error)
      return {
        status: "error",
        message: "Supabase is reachable, but the schema check failed.",
      };
    return {
      status: "connected",
      message: "Supabase connection and public schema are available.",
    };
  } catch {
    return {
      status: "error",
      message: "Supabase connection could not be verified.",
    };
  }
}
