import type { MetadataRoute } from "next";
import { createPublicClient as createClient } from "@/lib/supabase/public";
import { sitemapEntry, safeDate } from "./helpers";
export async function getCategorySitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const client = createClient();
    if (client) {
      const { data, error } = await client
        .from("categories")
        .select("slug,created_at,updated_at")
        .eq("is_active", true)
        .order("updated_at", { ascending: false });
      if (!error)
        return data.map((x) =>
          sitemapEntry(
            `/kategori/${x.slug}`,
            safeDate(x.updated_at, x.created_at),
            "daily",
            0.9,
          ),
        );
    }
  } catch {}
  return [];
}
