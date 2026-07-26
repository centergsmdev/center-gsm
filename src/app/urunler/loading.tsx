import { CatalogGridSkeleton } from "@/components/catalog/catalog-grid-skeleton";
import { Container } from "@/components/ui/container";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProductsLoading() {
  return (
    <main className="min-h-screen bg-surface-subtle/50 py-8">
      <Container>
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-7 h-10 w-72" />
        <Skeleton className="mt-3 h-5 max-w-xl" />
        <div className="my-6 flex justify-between border-y border-border py-4">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-10 w-48" />
        </div>
        <CatalogGridSkeleton />
      </Container>
    </main>
  );
}
