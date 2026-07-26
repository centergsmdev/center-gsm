import type { MetadataRoute } from "next";
import { canonicalUrl } from "@/lib/seo/canonical";
import { createResponseHeaders } from "@/lib/performance/headers";
export type SitemapEntry = MetadataRoute.Sitemap[number];
export const sitemapEntry = (
  path: string,
  lastModified: string | Date,
  changeFrequency: NonNullable<SitemapEntry["changeFrequency"]>,
  priority: number,
): SitemapEntry => ({
  url: canonicalUrl(path),
  lastModified,
  changeFrequency,
  priority,
});
export const safeDate = (
  updated: string | null | undefined,
  created?: string | null,
) => updated ?? created ?? new Date().toISOString();
const xmlEscape = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
export function sitemapXml(entries: MetadataRoute.Sitemap) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.map((x) => `<url><loc>${xmlEscape(x.url)}</loc>${x.lastModified ? `<lastmod>${new Date(x.lastModified).toISOString()}</lastmod>` : ""}${x.changeFrequency ? `<changefreq>${x.changeFrequency}</changefreq>` : ""}${typeof x.priority === "number" ? `<priority>${x.priority.toFixed(1)}</priority>` : ""}</url>`).join("")}</urlset>`;
}
export function sitemapIndexXml(paths: string[]) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((path) => `<sitemap><loc>${xmlEscape(canonicalUrl(path))}</loc></sitemap>`).join("")}</sitemapindex>`;
}
export const xmlResponse = (body: string) =>
  new Response(body, {
    headers: createResponseHeaders({
      profile: "settings",
      contentType: "application/xml; charset=utf-8",
      etagSource: body,
      staleWhileRevalidate: 86400,
    }),
  });
