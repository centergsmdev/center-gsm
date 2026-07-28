import type { MetadataRoute } from "next";
import { canonicalUrl } from "@/lib/seo/canonical";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",
        "/auth/",
        "/favoriler",
        "/hesabim/",
        "/odeme",
        "/sepet",
        "/sifre-yenile",
        "/sifremi-unuttum",
        "/siparis/",
        "/siparis-basarili",
        "/siparis-takip",
      ],
    },
    sitemap: canonicalUrl("/sitemap.xml"),
    host: canonicalUrl("/"),
  };
}
