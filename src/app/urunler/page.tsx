import { CatalogBreadcrumb } from "@/components/catalog/breadcrumb";
import { CatalogToolbar } from "@/components/catalog/catalog-toolbar";
import dynamic from "next/dynamic";
import { Pagination } from "@/components/catalog/pagination";
import { ProductCard } from "@/components/catalog/product-card";
import {
  CatalogEmptyState,
  CatalogErrorState,
} from "@/components/catalog/catalog-states";
import { Container } from "@/components/ui/container";
import { getBrands, getCategories, getProducts } from "@/lib/catalog/data";
import {
  catalogFiltersFromParams,
  type CatalogSearchParams,
} from "@/lib/catalog/params";
export const revalidate = 300;
const FilterPanel = dynamic(
  () =>
    import("@/components/catalog/filter-panel").then(
      (module) => module.FilterPanel,
    ),
  {
    loading: () => (
      <div
        className="h-80 w-full shrink-0 rounded-lg bg-zinc-100 lg:w-64"
        aria-hidden="true"
      />
    ),
  },
);

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<CatalogSearchParams>;
}) {
  const params = await searchParams;
  const filters = catalogFiltersFromParams(params);
  const [result, categories, brands] = await Promise.all([
    getProducts(filters),
    getCategories(),
    getBrands(),
  ]);
  const hasError = result.error || categories.error || brands.error;
  const totalPages = Math.ceil(result.total / result.pageSize);
  return (
    <main className="tech-atmosphere min-h-screen pb-12 pt-5 sm:pb-16 sm:pt-7">
      <Container>
        <CatalogBreadcrumb />
        <div className="mt-6 max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
            Premium katalog
          </p>
          <h1 className="mt-2 text-balance text-3xl font-black tracking-[-0.045em] text-foreground sm:text-4xl">
            Teknoloji ürünleri
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted sm:text-base">
            Akıllı telefonlardan bilgisayarlara, günlük yaşamınıza değer katan
            seçili teknoloji ürünlerini keşfedin.
          </p>
        </div>
        <CatalogToolbar count={result.total} />
        <div className="mt-5 flex flex-col items-start gap-5 lg:flex-row">
          <FilterPanel
            categories={categories.data}
            brands={brands.data}
            params={params}
            basePath="/urunler"
          />
          <div className="min-w-0 flex-1">
            {hasError ? (
              <CatalogErrorState />
            ) : result.data.length === 0 ? (
              <CatalogEmptyState />
            ) : (
              <div className="stagger-grid grid grid-cols-2 gap-[clamp(0.5rem,2vw,0.75rem)] md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {result.data.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    compactMobile
                  />
                ))}
              </div>
            )}{" "}
            {!hasError ? (
              <Pagination
                page={result.page}
                totalPages={totalPages}
                basePath="/urunler"
                params={params}
              />
            ) : null}
          </div>
        </div>
      </Container>
    </main>
  );
}
