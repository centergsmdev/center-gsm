"use client";

import { CartErrorState } from "@/components/cart/cart-error-state";
import { Container } from "@/components/ui/container";

export default function CartError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-[60vh] py-12">
      <Container>
        <CartErrorState onRetry={reset} />
      </Container>
    </main>
  );
}
