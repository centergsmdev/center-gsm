import { Headphones, Laptop, Smartphone, Tablet, Watch } from "lucide-react";

import { cn } from "@/lib/utils";
import type { CatalogProduct } from "@/types/product";
import { imagePerformanceProps, type ImagePerformancePreset } from "@/lib/performance/helpers";

const accents = {
  graphite: "from-zinc-300 via-zinc-100 to-white text-zinc-800",
  silver: "from-slate-200 via-white to-zinc-100 text-slate-700",
  red: "from-red-100 via-white to-zinc-100 text-red-700",
  blue: "from-blue-100 via-white to-zinc-100 text-blue-700",
  cream: "from-amber-100 via-white to-zinc-100 text-amber-800",
  black: "from-zinc-300 via-zinc-100 to-white text-zinc-950",
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
        "relative grid size-full place-items-center overflow-hidden bg-gradient-to-br",
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
          className="absolute inset-0 size-full object-contain p-4 transition-transform duration-250 ease-premium group-hover:scale-[1.07]"
        />
      ) : null}
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 size-36 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70 blur-2xl"
      />
      {!resolvedImage ? (
        <Icon
          aria-hidden="true"
          className="relative size-20 drop-shadow-xl transition-transform duration-250 ease-premium group-hover:scale-[1.07] sm:size-24"
          strokeWidth={0.85}
        />
      ) : null}
      <span className="absolute bottom-3 text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400">
        Ürün görseli
      </span>
    </div>
  );
}
