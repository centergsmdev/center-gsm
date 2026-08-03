import { canonicalUrl } from "@/lib/seo/canonical";
import { SEO_CONFIG } from "@/lib/seo/constants";
import { absoluteAssetUrl } from "./helpers";
import type { JsonLdObject } from "./types";

export function createOrganizationSchema(
  input: { sameAs?: string[]; address?: JsonLdObject } = {},
): JsonLdObject {
  const hasContact = Boolean(
    SEO_CONFIG.supportEmail || SEO_CONFIG.supportPhone,
  );
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SEO_CONFIG.organizationName,
    url: canonicalUrl("/"),
    logo: absoluteAssetUrl(SEO_CONFIG.organizationLogo),
    email: SEO_CONFIG.supportEmail || undefined,
    telephone: SEO_CONFIG.supportPhone || undefined,
    areaServed: { "@type": "Country", name: "Türkiye" },
    contactPoint: hasContact
      ? {
          "@type": "ContactPoint",
          telephone: SEO_CONFIG.supportPhone || undefined,
          email: SEO_CONFIG.supportEmail || undefined,
          contactType: "customer support",
          areaServed: "TR",
          availableLanguage: ["Turkish"],
        }
      : undefined,
    sameAs: input.sameAs ?? [],
    address: input.address,
    brand: { "@type": "Brand", name: SEO_CONFIG.siteName },
  };
}
