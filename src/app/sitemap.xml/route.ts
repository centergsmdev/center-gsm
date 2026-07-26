import{SITEMAP_PATHS,sitemapIndexXml,xmlResponse}from"@/lib/seo/sitemap/sitemap";export const revalidate=3600;export function GET(){return xmlResponse(sitemapIndexXml([...SITEMAP_PATHS]))}
