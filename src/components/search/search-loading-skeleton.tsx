import { CatalogGridSkeleton } from "@/components/catalog/catalog-grid-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export function SearchLoadingSkeleton() {
  return (
    <div role="status" aria-label="Arama sonuçları yükleniyor">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-7 h-10 w-72" />
      <Skeleton className="mt-3 h-5 max-w-lg" />
      <div className="my-6 flex justify-between border-y border-border py-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-10 w-48" />
      </div>
      <CatalogGridSkeleton />
    </div>
  );
}
