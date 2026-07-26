"use client";

import { CartBreadcrumb } from "@/components/cart/cart-breadcrumb";
import { CartEmptyState } from "@/components/cart/cart-empty-state";
import { CartItemCard } from "@/components/cart/cart-item-card";
import { OrderSummary } from "@/components/cart/order-summary";
import { Container } from "@/components/ui/container";
import { useCart } from "@/providers/cart-provider";

export default function CartPage() {
  const { lines, itemCount } = useCart();
  return (
    <main className="min-h-screen tech-atmosphere pb-12 pt-5 sm:pb-16 sm:pt-7">
      <Container>
        <CartBreadcrumb />
        {lines.length === 0 ? (
          <div className="mt-6">
            <CartEmptyState />
          </div>
        ) : (
          <>
            <div className="mt-6">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">
                Alışveriş sepeti
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-[-0.045em] sm:text-4xl">
                Sepetim
              </h1>
              <p className="mt-2 text-sm text-muted">
                Sepetinizde {itemCount} ürün bulunuyor.
              </p>
            </div>
            <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
              <section aria-label="Sepet ürünleri" className="space-y-4">
                {lines.map((line) => (
                  <CartItemCard key={line.product.id} line={line} />
                ))}
              </section>
              <OrderSummary />
            </div>
          </>
        )}
      </Container>
    </main>
  );
}
