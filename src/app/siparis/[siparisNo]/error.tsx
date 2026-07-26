"use client";
import { OrderTrackingErrorState } from "@/components/order-tracking/order-tracking-error-state";
import { Container } from "@/components/ui/container";
export default function OrderDetailError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-[60vh] py-12">
      <Container>
        <OrderTrackingErrorState onRetry={reset} />
      </Container>
    </main>
  );
}
