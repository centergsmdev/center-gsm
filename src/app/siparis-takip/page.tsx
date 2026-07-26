import { OrderTrackingBreadcrumb } from "@/components/order-tracking/order-tracking-breadcrumb";
import { OrderTrackingForm } from "@/components/order-tracking/order-tracking-form";
import { Container } from "@/components/ui/container";
export default function OrderTrackingPage() {
  return (
    <main className="min-h-screen bg-surface-subtle/50 pb-16 pt-6 sm:pb-20 sm:pt-8">
      <Container>
        <OrderTrackingBreadcrumb />
        <div className="mx-auto mb-8 mt-8 max-w-2xl text-center">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">
            Siparişiniz nerede?
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.045em] sm:text-4xl">
            Sipariş Takip
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            Siparişinizin durumunu ve kargo hareketlerini güvenle görüntüleyin.
          </p>
        </div>
        <OrderTrackingForm />
      </Container>
    </main>
  );
}
