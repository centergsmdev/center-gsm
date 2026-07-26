import { CheckoutBreadcrumb } from "@/components/checkout/checkout-breadcrumb";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { Container } from "@/components/ui/container";

export default function CheckoutPage() {
  return (
    <main className="min-h-screen tech-atmosphere pb-12 pt-5 sm:pb-16 sm:pt-7">
      <Container>
        <CheckoutBreadcrumb />
        <div className="mb-8 mt-6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">
            Güvenli sipariş adımı
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.045em] sm:text-4xl">
            Teslimat ve Ödeme
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
            Teslimat tercihlerinizi tamamlayın. Bu demo akışında gerçek ödeme
            alınmaz.
          </p>
        </div>
        <CheckoutForm />
      </Container>
    </main>
  );
}
