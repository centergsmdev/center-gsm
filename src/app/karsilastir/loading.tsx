import { ComparisonLoadingSkeleton } from "@/components/comparison/comparison-loading-skeleton";
import { Container } from "@/components/ui/container";
import { Skeleton } from "@/components/ui/skeleton";

export default function ComparisonLoading() {
  return (
    <main className="min-h-screen py-8">
      <Container>
        <Skeleton className="h-4 w-36" />
        <Skeleton className="mt-8 h-10 w-72" />
        <Skeleton className="mb-8 mt-3 h-5 max-w-xl" />
        <ComparisonLoadingSkeleton />
      </Container>
    </main>
  );
}
