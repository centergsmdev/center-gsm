import { ProductDetailSkeleton } from "@/components/product-detail/product-detail-skeleton";
import { Container } from "@/components/ui/container";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProductLoading() {
  return (
    <main className="min-h-screen py-8">
      <Container>
        <Skeleton className="mb-6 h-4 w-64" />
        <ProductDetailSkeleton />
      </Container>
    </main>
  );
}
