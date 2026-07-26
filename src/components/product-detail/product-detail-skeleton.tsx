import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ProductDetailSkeleton() {
  return (
    <div
      role="status"
      aria-label="Ürün bilgileri yükleniyor"
      className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)] lg:gap-12"
    >
      <div>
        <Skeleton className="aspect-square rounded-xl" />
        <div className="mt-3 grid grid-cols-4 gap-2">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="aspect-square rounded-md" />
          ))}
        </div>
      </div>
      <div>
        <Skeleton className="h-4 w-20" />
        <Skeleton className="mt-4 h-11 w-3/4" />
        <Skeleton className="mt-3 h-5 w-full" />
        <Skeleton className="mt-2 h-5 w-2/3" />
        <Skeleton className="my-7 h-px w-full" />
        <Skeleton className="h-10 w-48" />
        <Skeleton className="mt-3 h-6 w-56" />
        <Card className="mt-6 space-y-3 p-5">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </Card>
        <Skeleton className="mt-6 h-12 w-full rounded-full" />
        <Skeleton className="mt-2 h-12 w-full rounded-full" />
      </div>
      <span className="sr-only">Ürün detayları yükleniyor.</span>
    </div>
  );
}
