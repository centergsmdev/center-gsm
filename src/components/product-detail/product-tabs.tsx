"use client";

import { cn } from "@/lib/utils";
import type { CatalogProduct } from "@/types/product";

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

function RichProductContent({ html }: { html: string }) {
  return (
    <div
      className={cn(
        "max-w-4xl text-sm leading-7 text-muted",
        "[&_blockquote]:my-4 [&_blockquote]:border-l-2 [&_blockquote]:border-primary [&_blockquote]:pl-4",
        "[&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-foreground",
        "[&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-foreground",
        "[&_li]:my-1 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6",
        "[&_p]:my-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6",
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
