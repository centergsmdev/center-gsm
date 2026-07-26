import { CatalogGridSkeleton } from "@/components/catalog/catalog-grid-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export function FavoritesLoadingSkeleton() {
  return (
    <div role="status" aria-label="Favoriler yükleniyor">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-7 h-10 w-56" />
      <Skeleton className="mt-3 h-5 max-w-lg" />
      <div className="mt-8">
        <CatalogGridSkeleton count={4} />
      </div>
      <span className="sr-only">Favori ürünler yükleniyor.</span>
    </div>
  );
}
