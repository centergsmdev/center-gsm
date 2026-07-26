"use client";

import { ProductDetailErrorState } from "@/components/product-detail/product-detail-states";
import { Container } from "@/components/ui/container";

export default function ProductError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-[60vh] py-12">
      <Container>
        <ProductDetailErrorState onRetry={reset} />
      </Container>
    </main>
  );
}
