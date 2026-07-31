import type { MetadataRoute } from "next";
import { canonicalUrl } from "@/lib/seo/canonical";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/admin",
        "/admin/",
        "/auth/",
        "/favoriler",
        "/giris",
        "/hesabim",
        "/hesabim/",
        "/karsilastir",
        "/kayit",
        "/odeme",
        "/sepet",
        "/sifre-yenile",
        "/sifremi-unuttum",
        "/siparis",
        "/siparis/",
        "/siparis-basarili",
        "/siparis-takip",
      ],
    },
    sitemap: canonicalUrl("/sitemap.xml"),
    host: canonicalUrl("/"),
  };
}
