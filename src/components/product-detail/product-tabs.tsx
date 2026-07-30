"use client";

import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";
import type { CatalogProduct } from "@/types/product";

type ProductTab = {
  id: "description" | "technical" | "box" | "delivery";
  label: string;
  content: string;
  rich: boolean;
};

export function ProductTabs({ product }: { product: CatalogProduct }) {
  const tabs = useMemo(
    () =>
      [
        product.description
          ? {
              id: "description" as const,
              label: "Açıklama",
              content: product.description,
              rich: false,
            }
          : null,
        product.technicalSpecifications
          ? {
              id: "technical" as const,
              label: "Teknik Özellikler",
              content: product.technicalSpecifications,
              rich: true,
            }
          : null,
        product.boxContents
          ? {
              id: "box" as const,
              label: "Kutu İçeriği",
              content: product.boxContents,
              rich: true,
            }
          : null,
        product.deliveryReturns
          ? {
              id: "delivery" as const,
              label: "Teslimat ve İade",
              content: product.deliveryReturns,
              rich: true,
            }
          : null,
      ].filter((tab): tab is ProductTab => Boolean(tab)),
    [product],
  );
  const [selectedId, setSelectedId] = useState<ProductTab["id"]>(
    tabs[0]?.id ?? "description",
  );
  const activeTab = tabs.find((tab) => tab.id === selectedId) ?? tabs[0];

  if (!activeTab) return null;

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
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={activeTab.id === tab.id}
            aria-controls="product-tab-panel"
            onClick={() => setSelectedId(tab.id)}
            className={cn(
              "relative min-h-14 shrink-0 px-3 text-xs font-bold text-muted transition-colors duration-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:px-5 sm:text-sm",
              activeTab.id === tab.id &&
                "text-foreground after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-primary",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div
        id="product-tab-panel"
        role="tabpanel"
        aria-labelledby={`tab-${activeTab.id}`}
        className="p-5 sm:p-8"
      >
        {activeTab.rich ? (
          <RichProductContent html={activeTab.content} />
        ) : (
          <p className="max-w-4xl whitespace-pre-line text-sm leading-7 text-muted">
            {activeTab.content}
          </p>
        )}
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
