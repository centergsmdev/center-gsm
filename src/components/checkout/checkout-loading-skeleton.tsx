import { Skeleton } from "@/components/ui/skeleton";

export function CheckoutLoadingSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-5">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="rounded-xl border border-border bg-white p-6"
          >
            <Skeleton className="h-7 w-52" />
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((__, field) => (
                <Skeleton key={field} className="h-16" />
              ))}
            </div>
          </div>
        ))}
      </div>
      <Skeleton className="h-[520px] rounded-xl" />
    </div>
  );
}
