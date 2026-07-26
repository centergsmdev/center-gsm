"use client";

import { useState } from "react";
import { Maximize2 } from "lucide-react";

import { ProductVisual } from "@/components/catalog/product-visual";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/utils";
import type { CatalogProduct } from "@/types/product";

const views = ["Ön görünüm", "Arka görünüm", "Yan görünüm", "Detay görünümü"];

export function ProductGallery({ product }: { product: CatalogProduct }) {
  const [selectedView, setSelectedView] = useState(0);
  const galleryItems = product.imageUrls?.length
    ? product.imageUrls.map((url, index) => ({
        label: `${product.brand} ${product.model} görsel ${index + 1}`,
        url,
      }))
    : views.map((label) => ({ label, url: undefined }));

  return (
    <section aria-label="Ürün galerisi" className="min-w-0">
      <div
        id="product-main-image"
        role="tabpanel"
        className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-surface-subtle shadow-xs"
      >
        <div
          className={cn(
            "size-full transition-transform duration-250 ease-premium",
            selectedView === 1 && "-rotate-3 scale-95",
            selectedView === 2 && "rotate-6 scale-90",
            selectedView === 3 && "scale-110",
          )}
        >
          <ProductVisual
            product={product}
            imageUrl={galleryItems[selectedView]?.url}
            performancePreset="product-gallery"
          />
        </div>
        <IconButton
          label="Ürün görselini büyüt"
          variant="outline"
          className="absolute right-4 top-4 z-raised bg-white/90 backdrop-blur"
          aria-haspopup="dialog"
        >
          <Maximize2 className="size-4" aria-hidden="true" />
        </IconButton>
        <p className="absolute bottom-4 left-4 z-raised rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-semibold text-zinc-600 backdrop-blur">
          Yakınlaştırmak için tıklayın
        </p>
      </div>

      <div
        className="mt-3 flex snap-x gap-2 overflow-x-auto pb-2 sm:grid sm:grid-cols-4 sm:overflow-visible"
        role="tablist"
        aria-label="Ürün görünümleri"
      >
        {galleryItems.map((view, index) => (
          <button
            key={`${view.label}-${index}`}
            type="button"
            role="tab"
            aria-selected={selectedView === index}
            aria-controls="product-main-image"
            onClick={() => setSelectedView(index)}
            className={cn(
              "relative aspect-square min-w-20 snap-start overflow-hidden rounded-md border bg-surface-subtle transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:min-w-0",
              selectedView === index
                ? "border-zinc-950 shadow-sm"
                : "border-border hover:border-border-strong",
            )}
          >
            <div
              className={cn(
                "size-full scale-75",
                index === 1 && "-rotate-3",
                index === 2 && "rotate-6",
                index === 3 && "scale-90",
              )}
            >
              <ProductVisual product={product} imageUrl={view.url} performancePreset="thumbnail" />
            </div>
            <span className="sr-only">{view.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
