import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function CatalogGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-label="Ürünler yükleniyor"
      className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
    >
      {Array.from({ length: count }, (_, index) => (
        <Card key={index} className="overflow-hidden">
          <Skeleton className="aspect-square rounded-none" />
          <div className="space-y-3 p-5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <div className="pt-4">
              <Skeleton className="h-7 w-28" />
              <Skeleton className="mt-4 h-11 w-full rounded-full" />
            </div>
          </div>
        </Card>
      ))}
      <span className="sr-only">Ürün listesi yükleniyor.</span>
    </div>
  );
}
