import { Headphones, Laptop, Smartphone, Tablet, Watch } from "lucide-react";

import { cn } from "@/lib/utils";
import type { CatalogProduct } from "@/types/product";
import {
  imagePerformanceProps,
  type ImagePerformancePreset,
} from "@/lib/performance/helpers";

const accents = {
  graphite: "text-zinc-800",
  silver: "text-slate-700",
  red: "text-red-700",
  blue: "text-blue-700",
  cream: "text-amber-800",
  black: "text-zinc-950",
};

const icons = {
  Telefon: Smartphone,
  Bilgisayar: Laptop,
  Tablet,
  "Akıllı Saat": Watch,
  Kulaklık: Headphones,
  Aksesuar: Headphones,
};

export function ProductVisual({
  product,
  imageUrl,
  performancePreset = "product-card",
}: {
  product: CatalogProduct;
  imageUrl?: string;
  performancePreset?: ImagePerformancePreset;
}) {
  const Icon = icons[product.category];
  const resolvedImage = imageUrl ?? product.mainImageUrl;
  const imageProps = imagePerformanceProps(performancePreset);
  return (
    <div
      className={cn(
        "relative grid size-full place-items-center overflow-hidden bg-white",
        accents[product.accent],
      )}
      aria-label={`${product.brand} ${product.model} ürün görseli alanı`}
    >
      {resolvedImage ? (
        // Supabase Storage URLs are rendered directly so unknown projects do not require build-time host configuration.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolvedImage}
          alt={`${product.brand} ${product.model}`}
          width={imageProps.width}
          height={imageProps.height}
          sizes={imageProps.sizes}
          loading={imageProps.loading}
          decoding={imageProps.decoding}
          fetchPriority={imageProps.priority ? "high" : "auto"}
          className="absolute inset-0 size-full object-contain object-center p-4 transition-transform duration-250 ease-premium group-hover:scale-[1.07]"
        />
      ) : null}
      {!resolvedImage ? (
        <>
          <div
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 size-36 -translate-x-1/2 -translate-y-1/2 rounded-full bg-zinc-100/80 blur-2xl"
          />
          <Icon
            aria-hidden="true"
            className="relative size-20 drop-shadow-xl transition-transform duration-250 ease-premium group-hover:scale-[1.07] sm:size-24"
            strokeWidth={0.85}
          />
        </>
      ) : null}
    </div>
  );
}
