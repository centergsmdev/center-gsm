import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";

import { ProductDetailExperience } from "@/components/product-detail/product-detail-experience";
import { ProductReviews } from "@/components/product-detail/product-reviews";
import { RecentlyViewedProducts } from "@/components/product-detail/recently-viewed-products";
import { ProductDetailErrorState } from "@/components/product-detail/product-detail-states";
import { Container } from "@/components/ui/container";
import { Divider } from "@/components/ui/divider";
import { catalogProducts } from "@/data/catalog-products";
import { getProductBySlug, getRelatedProducts } from "@/lib/catalog/data";
import { sanitizeRichText } from "@/lib/content/rich-text";
import { getApprovedProductReviews } from "@/lib/reviews/data";
import { generateSeoMetadata, plainText } from "@/lib/seo/seo";
import {
  JsonLd,
  createBreadcrumbSchema,
  createProductSchema,
  schemaSlug,
} from "@/lib/seo/schema";

type ProductPageProps = { params: Promise<{ slug: string }> };
export const revalidate = 600;
const ProductTabs = dynamic(
  () =>
    import("@/components/product-detail/product-tabs").then(
      (module) => module.ProductTabs,
    ),
  {
    loading: () => (
      <div className="h-72 rounded-xl bg-zinc-100" aria-hidden="true" />
    ),
  },
);
const ProductRecommendations = dynamic(
  () =>
    import("@/components/product-detail/product-recommendations").then(
      (module) => module.ProductRecommendations,
    ),
  {
    loading: () => (
      <div className="h-96 rounded-xl bg-zinc-100" aria-hidden="true" />
    ),
  },
);
export function generateStaticParams() {
  return catalogProducts.map((product) => ({ slug: product.slug }));
}
export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getProductBySlug(slug);
  const productName = result.data
    ? `${result.data.brand} ${result.data.model}`
    : "";
  const productDescription = result.data
    ? plainText(result.data.description) ||
      `${productName}, ${result.data.category} kategorisinde CENTER GSM güvencesiyle satışta.`
    : "";
  return result.data
    ? generateSeoMetadata({
        title: productName,
        description: productDescription,
        keywords: [
          result.data.brand,
          result.data.category,
          result.data.sku ?? "",
          result.data.model,
        ],
        canonical: `/urun/${result.data.slug}`,
        category: result.data.category,
        social: {
          title: productName,
          description: productDescription,
          canonical: `/urun/${result.data.slug}`,
          image: result.data.mainImageUrl ?? result.data.imageUrls?.[0],
          product: {
            name: productName,
            brand: result.data.brand,
            category: result.data.category,
            price: result.data.price,
            currency: "TRY",
            availability:
              (result.data.availableStock ??
                (result.data.stockStatus === "out-of-stock" ? 0 : 1)) > 0
                ? "in stock"
                : "out of stock",
          },
        },
      })
    : generateSeoMetadata({
        title: "Ürün Bulunamadı",
        canonical: `/urun/${slug}`,
        robots: { index: false, follow: false },
      });
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const result = await getProductBySlug(slug);
  if (result.error)
    return (
      <main className="min-h-[60vh] py-12">
        <Container>
          <ProductDetailErrorState />
        </Container>
      </main>
    );
  if (!result.data) notFound();
  const product = {
    ...result.data,
    description: sanitizeRichText(result.data.description),
  };
  const [related, reviews] = await Promise.all([
    getRelatedProducts(product, 4),
    getApprovedProductReviews(product.id),
  ]);
  const hasManagedContent = Boolean(product.description);
  return (
    <main className="tech-atmosphere min-h-screen pb-12 pt-5 sm:pb-16 sm:pt-7">
      <JsonLd id="product-schema" data={createProductSchema(product)} />
      <JsonLd
        id="product-category-breadcrumb-schema"
        data={createBreadcrumbSchema([
          { name: "Ana Sayfa", path: "/" },
          { name: "Ürünler", path: "/urunler" },
          {
            name: product.category,
            path: `/kategori/${schemaSlug(product.category)}`,
          },
          {
            name: `${product.brand} ${product.model}`,
            path: `/urun/${product.slug}`,
          },
        ])}
      />
      <Container>
        <ProductDetailExperience product={product} />
        {hasManagedContent ? (
          <div className="mt-12 sm:mt-16">
            <ProductTabs product={product} />
          </div>
        ) : null}
        <ProductReviews
          productId={product.id}
          rating={product.rating}
          reviewCount={product.reviewCount}
          reviews={reviews}
        />
        {related.error ? (
          <ProductDetailErrorState />
        ) : (
          <ProductRecommendations
            eyebrow="Sizin için seçtik"
            title="Benzer ürünler"
            products={related.data}
          />
        )}
        <Divider />
        <RecentlyViewedProducts product={product} />
      </Container>
    </main>
  );
}
