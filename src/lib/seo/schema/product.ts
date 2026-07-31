import { canonicalUrl } from "@/lib/seo/canonical";
import { SEO_CONFIG } from "@/lib/seo/constants";
import { plainText } from "@/lib/seo/helpers";
import type { CatalogProduct } from "@/types/product";
import { absoluteAssetUrl } from "./helpers";
import type { JsonLdObject } from "./types";

export function createProductSchema(product: CatalogProduct): JsonLdObject {
  const available =
    product.availableStock !== undefined
      ? product.availableStock > 0
      : product.stockStatus !== "out-of-stock";
  const images = (
    product.imageUrls?.length
      ? product.imageUrls
      : product.mainImageUrl
        ? [product.mainImageUrl]
        : [SEO_CONFIG.organizationLogo]
  ).map(absoluteAssetUrl);
  const price =
    Number.isFinite(product.price) && product.price >= 0 ? product.price : 0;
  const name = `${product.brand} ${product.model}`;
  const description =
    plainText(product.description) ||
    `${name}, ${product.category} kategorisinde CENTER GSM güvencesiyle satışta.`;
  const aggregateRating =
    product.reviewCount > 0 && product.rating > 0
      ? {
          "@type": "AggregateRating" as const,
          ratingValue: product.rating,
          reviewCount: product.reviewCount,
          bestRating: 5,
          worstRating: 1,
        }
      : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    sku: product.sku ?? product.id,
    brand: { "@type": "Brand", name: product.brand },
    category: product.category,
    description,
    image: images,
    url: canonicalUrl(`/urun/${product.slug}`),
    aggregateRating,
    offers: {
      "@type": "Offer",
      url: canonicalUrl(`/urun/${product.slug}`),
      price: price.toFixed(2),
      priceCurrency: "TRY",
      availability: `https://schema.org/${available ? "InStock" : "OutOfStock"}`,
      itemCondition: "https://schema.org/NewCondition",
      seller: {
        "@type": "Organization",
        name: SEO_CONFIG.organizationName,
        url: canonicalUrl("/"),
      },
    },
  };
}
