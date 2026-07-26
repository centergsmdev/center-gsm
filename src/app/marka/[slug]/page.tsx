import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductsPage from "@/app/urunler/page";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { getBrands } from "@/lib/catalog/data";
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
    brands = await getBrands(),
    item = brands.data.find((x) => x.slug === slug),
    name = item?.name ?? slug.replaceAll("-", " ");
  return generateSeoMetadata({
    title: `${name} Ürünleri`,
    description: taxonomyDescription(name, "marka"),
    keywords: [name, `${name} ürünleri`],
    canonical: `/marka/${slug}`,
    category: "Marka",
    social: { title: `${name} Ürünleri`, description: taxonomyDescription(name, "marka"), canonical: `/marka/${slug}`, image: item?.logo_url ?? undefined },
    robots: item ? undefined : { index: false, follow: true },
  });
}
export default async function Page({ params, searchParams }: Props) {
  const { slug } = await params,
    brands = await getBrands(),
    item = brands.data.find((x) => x.slug === slug);
  if (!brands.error && !item) notFound();
  const query = await searchParams,
    name = item?.name ?? slug.replaceAll("-", " "),
    description = taxonomyDescription(name, "marka"),
    path = `/marka/${slug}`;
  return (
    <>
      <JsonLd
        id="brand-collection-schema"
        data={createCollectionSchema({
          name,
          description,
          path,
          kind: "marka",
        })}
      />
      <JsonLd
        id="brand-breadcrumb-schema"
        data={createBreadcrumbSchema([
          { name: "Ana Sayfa", path: "/" },
          { name, path },
        ])}
      />
      <Header />
      <ProductsPage searchParams={Promise.resolve({ ...query, marka: slug })} />
      <Footer />
    </>
  );
}
