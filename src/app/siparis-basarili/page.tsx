import { OrderSuccess } from "@/components/checkout/order-success";
import { Container } from "@/components/ui/container";

export default function OrderSuccessPage() {
  return (
    <main className="min-h-screen bg-surface-subtle/50 py-10 sm:py-16">
      <Container>
        <OrderSuccess />
      </Container>
    </main>
  );
}
