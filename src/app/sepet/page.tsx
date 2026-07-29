"use client";

import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";

import { CartBreadcrumb } from "@/components/cart/cart-breadcrumb";
import { CartEmptyState } from "@/components/cart/cart-empty-state";
import { CartItemCard } from "@/components/cart/cart-item-card";
import { OrderSummary } from "@/components/cart/order-summary";
import { Container } from "@/components/ui/container";
import { useCart } from "@/providers/cart-provider";
import type { CartLine } from "@/types/cart";

export default function CartPage() {
  const { lines, itemCount, removeItem, addItem } = useCart();
  const [lastRemoved, setLastRemoved] = useState<CartLine | null>(null);

  useEffect(() => {
    if (!lastRemoved) return;
    const timer = window.setTimeout(() => setLastRemoved(null), 5000);
    return () => window.clearTimeout(timer);
  }, [lastRemoved]);

  function removeLine(line: CartLine) {
    removeItem(line.product.id);
    setLastRemoved(line);
  }

  function undoRemove() {
    if (!lastRemoved) return;
    addItem(lastRemoved.product.id, lastRemoved.quantity, lastRemoved.product);
    setLastRemoved(null);
  }

  return (
    <main className="tech-atmosphere min-h-screen pb-36 pt-3 sm:pb-16 sm:pt-7">
      <Container>
        <CartBreadcrumb />
        {lines.length === 0 ? (
          <div className="mt-6">
            <CartEmptyState />
          </div>
        ) : (
          <>
            <div className="mt-6 max-sm:hidden">
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
            <div className="mt-3 grid gap-4 sm:mt-7 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
              <section aria-label="Sepet ürünleri" className="space-y-4">
                {lines.map((line) => (
                  <CartItemCard
                    key={line.product.id}
                    line={line}
                    onRemove={() => removeLine(line)}
                  />
                ))}
              </section>
              <OrderSummary />
            </div>
          </>
        )}
      </Container>
      {lastRemoved ? (
        <div
          role="status"
          className="fixed bottom-24 left-4 right-4 z-toast mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white shadow-2xl sm:bottom-6"
        >
          <p className="min-w-0 truncate text-xs font-semibold">
            {lastRemoved.product.model} sepetten çıkarıldı.
          </p>
          <button
            type="button"
            onClick={undoRemove}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-xs font-bold transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            Geri Al
          </button>
        </div>
      ) : null}
    </main>
  );
}
