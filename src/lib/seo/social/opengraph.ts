import type { Metadata } from "next";
import { canonicalUrl } from "@/lib/seo/canonical";
import { SEO_CONFIG } from "@/lib/seo/constants";
import { socialImageUrl, DEFAULT_OG_IMAGE } from "./images";
import { safeSocialText } from "./helpers";
export type OpenGraphInput = {
  title?: string;
  description?: string;
  canonical?: string;
  image?: string;
  type?: "website";
};
export function createOpenGraph(
  input: OpenGraphInput = {},
): NonNullable<Metadata["openGraph"]> {
  const title = safeSocialText(input.title, SEO_CONFIG.defaultTitle, 100),
    description = safeSocialText(
      input.description,
      SEO_CONFIG.defaultDescription,
      200,
    ),
    url = canonicalUrl(input.canonical ?? "/"),
    image = socialImageUrl(input.image, DEFAULT_OG_IMAGE),
    isDefault = image === canonicalUrl(DEFAULT_OG_IMAGE);
  return {
    type: input.type ?? "website",
    siteName: SEO_CONFIG.siteName,
    title,
    description,
    url,
    locale: SEO_CONFIG.defaultLocale,
    images: [
      {
        url: image,
        width: isDefault ? 1921 : 1200,
        height: isDefault ? 819 : 630,
        alt: title,
      },
    ],
  };
}
