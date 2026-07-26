import type { MetadataRoute } from "next";
import { catalogProducts } from "@/data/catalog-products";
import { createPublicClient as createClient } from "@/lib/supabase/public";
import { sitemapEntry, safeDate } from "./helpers";
const slug = (v: string) =>
  v
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
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
  return [...new Set(catalogProducts.map((x) => x.category))].map((x) =>
    sitemapEntry(
      `/kategori/${slug(x)}`,
      "2026-07-25T00:00:00.000Z",
      "daily",
      0.9,
    ),
  );
}
