import { ProductCard } from "@/components/catalog/product-card";
import { SearchEmptyState } from "@/components/search/search-empty-state";
import type { CatalogProduct } from "@/types/product";

export function SearchResultsGrid({
  products,
  query,
}: {
  products: CatalogProduct[];
  query: string;
}) {
  if (products.length === 0) return <SearchEmptyState query={query} />;
  return (
    <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
