import { OrderTrackingLoadingSkeleton } from "@/components/order-tracking/order-tracking-loading-skeleton";
import { Container } from "@/components/ui/container";
export default function OrderTrackingLoading() {
  return (
    <main className="min-h-screen py-10">
      <Container>
        <OrderTrackingLoadingSkeleton />
      </Container>
    </main>
  );
}
