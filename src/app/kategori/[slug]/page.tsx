import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import ProductsPage from "@/app/urunler/page";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { getCategories } from "@/lib/catalog/data";
import { normalizeTaxonomySlug } from "@/lib/catalog/taxonomy-slug";
import { generateSeoMetadata, taxonomyDescription } from "@/lib/seo/seo";
import {
  JsonLd,
  createBreadcrumbSchema,
  createCollectionSchema,
} from "@/lib/seo/schema";
type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
export const revalidate = 600;
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params,
    categories = await getCategories(),
    item = categories.data.find(
      (x) => normalizeTaxonomySlug(x.slug) === normalizeTaxonomySlug(slug),
    ),
    name = item?.name ?? slug.replaceAll("-", " "),
    canonicalSlug = normalizeTaxonomySlug(item?.slug ?? slug);
  return generateSeoMetadata({
    title: `${name} Ürünleri`,
    description: taxonomyDescription(name, "kategori"),
    keywords: [name, `${name} ürünleri`],
    canonical: `/kategori/${canonicalSlug}`,
    category: name,
    social: {
      title: `${name} Ürünleri`,
      description: taxonomyDescription(name, "kategori"),
      canonical: `/kategori/${canonicalSlug}`,
      image: item?.image_url ?? undefined,
    },
    robots: item ? undefined : { index: false, follow: true },
  });
}
export default async function Page({ params, searchParams }: Props) {
  const { slug } = await params,
    categories = await getCategories(),
    item = categories.data.find(
      (x) => normalizeTaxonomySlug(x.slug) === normalizeTaxonomySlug(slug),
    );
  if (!categories.error && !item) notFound();
  const canonicalSlug = normalizeTaxonomySlug(item?.slug ?? slug);
  if (slug !== canonicalSlug) redirect(`/kategori/${canonicalSlug}`);
  const query = await searchParams,
    name = item?.name ?? slug.replaceAll("-", " "),
    description = taxonomyDescription(name, "kategori"),
    path = `/kategori/${canonicalSlug}`;
  return (
    <>
      <JsonLd
        id="category-collection-schema"
        data={createCollectionSchema({
          name,
          description,
          path,
          kind: "kategori",
        })}
      />
      <JsonLd
        id="category-breadcrumb-schema"
        data={createBreadcrumbSchema([
          { name: "Ana Sayfa", path: "/" },
          { name, path },
        ])}
      />
      <Header />
      <ProductsPage
        searchParams={Promise.resolve({
          ...query,
          kategori: item?.slug ?? slug,
        })}
      />
      <Footer />
    </>
  );
}
