import type { MetadataRoute } from "next";
import { sitemapEntry } from "./helpers";
const updated = "2026-07-28T00:00:00.000Z";
export function getPageSitemap(): MetadataRoute.Sitemap {
  return [
    sitemapEntry("/", updated, "daily", 1),
    sitemapEntry("/urunler", updated, "daily", 0.8),
    sitemapEntry("/kampanyalar", updated, "daily", 0.8),
    ...[
      "/hakkimizda",
      "/magazalarimiz",
      "/kariyer",
      "/iletisim",
      "/iade-ve-degisim",
      "/garanti",
      "/teknik-servis",
      "/kvkk",
      "/gizlilik",
      "/mesafeli-satis",
      "/cerez-tercihleri",
      "/sikca-sorulan-sorular",
    ].map((path) => sitemapEntry(path, updated, "monthly", 0.5)),
  ];
}
