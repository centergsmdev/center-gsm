import type { MetadataRoute } from "next";
import { catalogProducts } from "@/data/catalog-products";
import { createPublicClient as createClient } from "@/lib/supabase/public";
import { sitemapEntry, safeDate } from "./helpers";
export async function getProductSitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const client = createClient();
    if (client) {
      const { data, error } = await client
        .from("products")
        .select("slug,created_at,updated_at")
        .eq("is_active", true)
        .order("updated_at", { ascending: false });
      if (!error)
        return data.map((x) =>
          sitemapEntry(
            `/urun/${x.slug}`,
            safeDate(x.updated_at, x.created_at),
            "weekly",
            0.8,
          ),
        );
    }
  } catch {}
  return catalogProducts.map((x) =>
    sitemapEntry(`/urun/${x.slug}`, "2026-07-25T00:00:00.000Z", "weekly", 0.8),
  );
}
