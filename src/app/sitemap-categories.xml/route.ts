import{getCategorySitemap,sitemapXml,xmlResponse}from"@/lib/seo/sitemap/sitemap";export const revalidate=3600;export async function GET(){return xmlResponse(sitemapXml(await getCategorySitemap()))}
