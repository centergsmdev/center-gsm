import { CatalogToolbar } from "@/components/catalog/catalog-toolbar";
import { FilterPanel } from "@/components/catalog/filter-panel";
import { Pagination } from "@/components/catalog/pagination";
import { CatalogErrorState } from "@/components/catalog/catalog-states";
import { SearchBreadcrumb } from "@/components/search/search-breadcrumb";
import { SearchResultsGrid } from "@/components/search/search-results-grid";
import { Container } from "@/components/ui/container";
import { getBrands, getCategories, searchProducts } from "@/lib/catalog/data";
import {
  catalogFiltersFromParams,
  type CatalogSearchParams,
} from "@/lib/catalog/params";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<CatalogSearchParams>;
}) {
  const params = await searchParams;
  const queryParam = params.q;
  const query = Array.isArray(queryParam)
    ? (queryParam[0] ?? "")
    : (queryParam ?? "");
  const filters = catalogFiltersFromParams(params);
  const [result, categories, brands] = await Promise.all([
    searchProducts(query, filters),
    getCategories(),
    getBrands(),
  ]);
  const hasError = result.error || categories.error || brands.error;
  return (
    <main className="min-h-screen bg-surface-subtle/50 pb-16 pt-6 sm:pb-20 sm:pt-8">
      <Container>
        <SearchBreadcrumb />
        <div className="mt-6 max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">
            Arama sonuçları
          </p>
          <h1 className="mt-2 text-balance text-3xl font-black tracking-[-0.045em] sm:text-4xl">
            {query ? `“${query}” için sonuçlar` : "Tüm ürünlerde arayın"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            {query
              ? `${result.total} eşleşme bulundu. Sonuçları filtreleyebilir ve sıralayabilirsiniz.`
              : "Ürün, marka veya kategori arayarak teknoloji dünyasını keşfedin."}
          </p>
        </div>
        <CatalogToolbar count={result.total} />
        <div className="mt-6 flex flex-col items-start gap-6 lg:flex-row">
          <FilterPanel
            categories={categories.data}
            brands={brands.data}
            params={params}
            basePath="/arama"
          />
          <div className="min-w-0 flex-1">
            {hasError ? (
              <CatalogErrorState />
            ) : (
              <SearchResultsGrid products={result.data} query={query} />
            )}
            {!hasError ? (
              <Pagination
                page={result.page}
                totalPages={Math.ceil(result.total / result.pageSize)}
                basePath="/arama"
                params={params}
              />
            ) : null}
          </div>
        </div>
      </Container>
    </main>
  );
}
