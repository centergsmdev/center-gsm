import { Skeleton } from "@/components/ui/skeleton";

export function ComparisonLoadingSkeleton() {
  return (
    <div
      className="overflow-hidden rounded-xl border border-border bg-white"
      aria-label="Karşılaştırma listesi yükleniyor"
      aria-busy="true"
    >
      <div className="grid min-w-[760px] grid-cols-[150px_repeat(3,1fr)]">
        {Array.from({ length: 16 }).map((_, index) => (
          <div key={index} className="border-b border-r border-border p-4">
            <Skeleton className={index < 4 ? "h-36" : "h-5"} />
          </div>
        ))}
      </div>
    </div>
  );
}
