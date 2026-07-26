"use client";

import { CheckoutErrorState } from "@/components/checkout/checkout-error-state";
import { Container } from "@/components/ui/container";

export default function CheckoutError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-[60vh] py-12">
      <Container>
        <CheckoutErrorState onRetry={reset} />
      </Container>
    </main>
  );
}
