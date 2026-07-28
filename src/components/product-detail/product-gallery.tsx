"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";

import { ProductVisual } from "@/components/catalog/product-visual";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/utils";
import type { CatalogProduct } from "@/types/product";

const views = ["Ön görünüm", "Arka görünüm", "Yan görünüm", "Detay görünümü"];

export function ProductGallery({ product }: { product: CatalogProduct }) {
  const [selectedView, setSelectedView] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const galleryItems = product.imageUrls?.length
    ? product.imageUrls.map((url, index) => ({
        label: `${product.brand} ${product.model} görsel ${index + 1}`,
        url,
      }))
    : views.map((label) => ({ label, url: undefined }));

  function showPrevious() {
    setSelectedView((current) =>
      current === 0 ? galleryItems.length - 1 : current - 1,
    );
    setIsZoomed(false);
  }

  function showNext() {
    setSelectedView((current) => (current + 1) % galleryItems.length);
    setIsZoomed(false);
  }

  useEffect(() => {
    if (!isLightboxOpen) return;

    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsLightboxOpen(false);
      if (event.key === "ArrowLeft") {
        setSelectedView((current) =>
          current === 0 ? galleryItems.length - 1 : current - 1,
        );
        setIsZoomed(false);
      }
      if (event.key === "ArrowRight") {
        setSelectedView((current) => (current + 1) % galleryItems.length);
        setIsZoomed(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [galleryItems.length, isLightboxOpen]);

  const selectedItem = galleryItems[selectedView];

  return (
    <section aria-label="Ürün galerisi" className="min-w-0">
      <button
        id="product-main-image"
        type="button"
        onClick={() => setIsLightboxOpen(true)}
        className="group relative block aspect-square w-full overflow-hidden rounded-xl border border-border bg-white shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label={`${selectedItem?.label} görselini tam ekran aç`}
        aria-haspopup="dialog"
      >
        <div
          key={selectedItem?.url ?? selectedView}
          className="animate-in fade-in size-full duration-300"
        >
          <ProductVisual
            product={product}
            imageUrl={selectedItem?.url}
            performancePreset="product-gallery"
          />
        </div>
        <span className="absolute right-4 top-4 z-raised inline-grid size-11 place-items-center rounded-full border border-border bg-white/90 text-zinc-700 shadow-xs backdrop-blur">
          <Maximize2 className="size-4" aria-hidden="true" />
        </span>
        <span className="absolute bottom-4 left-4 z-raised rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-semibold text-zinc-600 backdrop-blur">
          Tam ekran görüntüle
        </span>
      </button>

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
              "relative aspect-square min-w-20 snap-start overflow-hidden rounded-md border bg-white transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:min-w-0",
              selectedView === index
                ? "border-primary shadow-[0_0_0_2px_rgba(220,38,38,0.12)]"
                : "border-border hover:border-border-strong",
            )}
          >
            <ProductVisual
              product={product}
              imageUrl={view.url}
              performancePreset="thumbnail"
            />
            <span className="sr-only">{view.label}</span>
          </button>
        ))}
      </div>

      {isLightboxOpen ? (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={`${product.brand} ${product.model} tam ekran galerisi`}
          tabIndex={-1}
          className="fixed inset-0 z-modal flex bg-black/95 p-3 outline-none backdrop-blur-sm sm:p-6"
          onClick={() => setIsLightboxOpen(false)}
          onTouchStart={(event) => {
            touchStartX.current = event.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(event) => {
            const start = touchStartX.current;
            const end = event.changedTouches[0]?.clientX;
            touchStartX.current = null;
            if (start === null || end === undefined) return;
            const distance = end - start;
            if (Math.abs(distance) < 50) return;
            if (distance > 0) showPrevious();
            else showNext();
          }}
        >
          <IconButton
            label="Galeriyi kapat"
            variant="dark"
            onClick={() => setIsLightboxOpen(false)}
            className="absolute right-4 top-4 z-raised border border-white/15 bg-white/10 text-white hover:bg-white/20 sm:right-6 sm:top-6"
          >
            <X className="size-5" aria-hidden="true" />
          </IconButton>

          {galleryItems.length > 1 ? (
            <>
              <IconButton
                label="Önceki görsel"
                variant="dark"
                onClick={(event) => {
                  event.stopPropagation();
                  showPrevious();
                }}
                className="absolute left-3 top-1/2 z-raised -translate-y-1/2 border border-white/15 bg-white/10 text-white hover:bg-white/20 sm:left-6"
              >
                <ChevronLeft className="size-6" aria-hidden="true" />
              </IconButton>
              <IconButton
                label="Sonraki görsel"
                variant="dark"
                onClick={(event) => {
                  event.stopPropagation();
                  showNext();
                }}
                className="absolute right-3 top-1/2 z-raised -translate-y-1/2 border border-white/15 bg-white/10 text-white hover:bg-white/20 sm:right-6"
              >
                <ChevronRight className="size-6" aria-hidden="true" />
              </IconButton>
            </>
          ) : null}

          <div
            className="m-auto flex size-full items-center justify-center overflow-auto px-12 py-16 [touch-action:pinch-zoom] sm:px-20"
            onClick={(event) => event.stopPropagation()}
          >
            {selectedItem?.url ? (
              // Supabase Storage URLs are intentionally rendered without a fixed host allowlist.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selectedItem.url}
                alt={selectedItem.label}
                onClick={() => setIsZoomed((current) => !current)}
                className={cn(
                  "max-h-full max-w-full cursor-zoom-in select-none object-contain transition-transform duration-300",
                  isZoomed && "scale-150 cursor-zoom-out",
                )}
              />
            ) : (
              <div className="aspect-square w-full max-w-3xl overflow-hidden rounded-xl">
                <ProductVisual
                  product={product}
                  performancePreset="product-gallery"
                />
              </div>
            )}
          </div>

          <p className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/75 backdrop-blur">
            {selectedView + 1} / {galleryItems.length}
          </p>
        </div>
      ) : null}
    </section>
  );
}
