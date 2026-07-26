import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";

import { ProductDetailBreadcrumb } from "@/components/product-detail/product-detail-breadcrumb";
import { ProductGallery } from "@/components/product-detail/product-gallery";
import { ProductInfo } from "@/components/product-detail/product-info";
import { ProductDetailErrorState } from "@/components/product-detail/product-detail-states";
import { Container } from "@/components/ui/container";
import { Divider } from "@/components/ui/divider";
import { catalogProducts } from "@/data/catalog-products";
import {
  getProductBySlug,
  getProducts,
  getRelatedProducts,
} from "@/lib/catalog/data";
import { generateSeoMetadata, plainText } from "@/lib/seo/seo";
import {
  JsonLd,
  createBreadcrumbSchema,
  createProductSchema,
  schemaSlug,
} from "@/lib/seo/schema";

type ProductPageProps = { params: Promise<{ slug: string }> };
export const revalidate = 600;
const ProductTabs = dynamic(() => import("@/components/product-detail/product-tabs").then((module) => module.ProductTabs), { loading: () => <div className="h-72 rounded-xl bg-zinc-100" aria-hidden="true" /> });
const ProductRecommendations = dynamic(() => import("@/components/product-detail/product-recommendations").then((module) => module.ProductRecommendations), { loading: () => <div className="h-96 rounded-xl bg-zinc-100" aria-hidden="true" /> });
export function generateStaticParams() {
  return catalogProducts.map((product) => ({ slug: product.slug }));
}
export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getProductBySlug(slug);
  return result.data
    ? generateSeoMetadata({
        title: `${result.data.brand} ${result.data.model}`,
        description: plainText(result.data.description),
        keywords: [
          result.data.brand,
          result.data.category,
          result.data.sku ?? "",
          result.data.model,
        ],
        canonical: `/urun/${slug}`,
        category: result.data.category,
        social: {
          title: `${result.data.brand} ${result.data.model}`,
          description: plainText(result.data.description),
          canonical: `/urun/${slug}`,
          image: result.data.mainImageUrl ?? result.data.imageUrls?.[0],
          product: {
            name: `${result.data.brand} ${result.data.model}`,
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
  const product = result.data;
  const [related, recent] = await Promise.all([
    getRelatedProducts(product, 4),
    getProducts({ pageSize: 5, sort: "newest" }),
  ]);
  return (
    <main className="min-h-screen tech-atmosphere pb-12 pt-5 sm:pb-16 sm:pt-7">
      <JsonLd id="product-schema" data={createProductSchema(product)} />
      <JsonLd
        id="product-category-breadcrumb-schema"
        data={createBreadcrumbSchema([
          { name: "Ana Sayfa", path: "/" },
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
      <JsonLd
        id="product-brand-breadcrumb-schema"
        data={createBreadcrumbSchema([
          { name: "Ana Sayfa", path: "/" },
          { name: product.brand, path: `/marka/${schemaSlug(product.brand)}` },
          {
            name: `${product.brand} ${product.model}`,
            path: `/urun/${product.slug}`,
          },
        ])}
      />
      <Container>
        <ProductDetailBreadcrumb product={product} />
        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.12fr)_minmax(360px,0.88fr)] lg:items-start lg:gap-12">
          <ProductGallery product={product} />
          <ProductInfo product={product} />
        </div>
        <div className="mt-12 sm:mt-16">
          <ProductTabs product={product} />
        </div>
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
        {recent.error ? null : (
          <ProductRecommendations
            eyebrow="Keşfetmeye devam edin"
            title="Son görüntülenen ürünler"
            products={recent.data.filter((item) => item.slug !== product.slug)}
          />
        )}
      </Container>
    </main>
  );
}
