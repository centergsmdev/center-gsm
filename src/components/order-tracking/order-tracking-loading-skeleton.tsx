import { Skeleton } from "@/components/ui/skeleton";

export function OrderTrackingLoadingSkeleton() {
  return (
    <div aria-busy="true" aria-label="Sipariş takip ekranı yükleniyor">
      <Skeleton className="mx-auto h-10 max-w-md" />
      <Skeleton className="mx-auto mt-4 h-5 max-w-xl" />
      <Skeleton className="mx-auto mt-10 h-[440px] max-w-xl rounded-xl" />
    </div>
  );
}
