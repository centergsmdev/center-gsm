import { unstable_noStore as noStore } from "next/cache";

import { footerPages } from "@/lib/footer/content";
import { createClient } from "@/lib/supabase/server";

export type FooterPageSlug = keyof typeof footerPages;

export async function getManagedFooterPage(slug: FooterPageSlug) {
  noStore();
  const fallback = footerPages[slug];
  const client = await createClient();
  if (!client) return fallback;
  const { data } = await client
    .from("content_pages")
    .select("eyebrow,title,description,body_html,is_published")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (!data) return fallback;
  return {
    eyebrow: data.eyebrow || fallback.eyebrow,
    title: data.title || fallback.title,
    description: data.description || fallback.description,
    sections: fallback.sections,
    bodyHtml: data.body_html || undefined,
  };
}
