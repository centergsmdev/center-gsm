import { CartLoadingSkeleton } from "@/components/cart/cart-loading-skeleton";
import { Container } from "@/components/ui/container";
import { Skeleton } from "@/components/ui/skeleton";

export default function CartLoading() {
  return (
    <main className="min-h-screen bg-surface-subtle/50 py-8">
      <Container>
        <Skeleton className="mb-7 h-10 w-52" />
        <CartLoadingSkeleton />
      </Container>
    </main>
  );
}
