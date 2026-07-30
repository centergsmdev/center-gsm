"use client";

import type { CatalogProduct } from "@/types/product";
import { RichProductContent } from "./rich-product-content";

export function ProductTabs({ product }: { product: CatalogProduct }) {
  if (!product.description) return null;

  return (
    <section
      aria-label="Ürün detayları"
      className="rounded-xl border border-border bg-surface shadow-xs"
    >
      <div
        className="flex overflow-x-auto border-b border-border px-2 sm:px-5"
        role="tablist"
        aria-label="Ürün bilgi sekmeleri"
      >
        <div
          role="tab"
          id="tab-description"
          aria-selected="true"
          aria-controls="product-tab-panel"
          className="relative min-h-14 px-3 py-5 text-xs font-bold text-foreground after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-primary sm:px-5 sm:text-sm"
        >
          Açıklama
        </div>
      </div>
      <div
        id="product-tab-panel"
        role="tabpanel"
        aria-labelledby="tab-description"
        className="p-5 sm:p-8"
      >
        <RichProductContent html={product.description} />
      </div>
    </section>
  );
}
