import{getPageSitemap,sitemapXml,xmlResponse}from"@/lib/seo/sitemap/sitemap";export const revalidate=3600;export function GET(){return xmlResponse(sitemapXml(getPageSitemap()))}
