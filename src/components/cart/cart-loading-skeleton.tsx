import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function CartLoadingSkeleton() {
  return (
    <div
      role="status"
      aria-label="Sepet yükleniyor"
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]"
    >
      <div className="space-y-4">
        {Array.from({ length: 2 }, (_, index) => (
          <Card key={index} className="flex gap-4 p-5">
            <Skeleton className="size-32 shrink-0 rounded-md" />
            <div className="flex-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-3 h-6 w-48" />
              <Skeleton className="mt-3 h-4 w-32" />
              <Skeleton className="mt-8 h-10 w-32 rounded-full" />
            </div>
          </Card>
        ))}
      </div>
      <Card className="space-y-4 p-6">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-px w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-12 w-full rounded-full" />
      </Card>
      <span className="sr-only">Sepet bilgileri yükleniyor.</span>
    </div>
  );
}
