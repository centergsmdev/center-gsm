import Link from "next/link";
import { ShieldCheck, Star, Truck } from "lucide-react";

import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { ProductVisual } from "@/components/catalog/product-visual";
import { ComparisonButton } from "@/components/comparison/comparison-button";
import { FavoriteButton } from "@/components/favorites/favorite-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import type { CatalogProduct } from "@/types/product";

export function ProductCard({ product }: { product: CatalogProduct }) {
  const productName = `${product.brand} ${product.model}`;
  const stock = {
    "in-stock": {
      label: "Stokta",
      className: "bg-emerald-50 text-emerald-700",
    },
    limited: { label: "Sınırlı stok", className: "bg-amber-50 text-amber-700" },
    "out-of-stock": { label: "Tükendi", className: "bg-red-50 text-red-700" },
  }[product.stockStatus];

  return (
    <Card className="home-premium-interactive home-premium-surface group relative flex h-full flex-col overflow-hidden border-zinc-200/80 bg-white active:scale-[0.99]">
      <div className="relative aspect-[3/2] overflow-hidden bg-gradient-to-br from-zinc-50 via-white to-zinc-100 [&_span]:hidden">
        <ProductVisual product={product} />
        {product.discountRate ? (
          <Badge
            variant="brand"
            className="absolute left-2.5 top-2.5 z-raised shadow-sm sm:left-3 sm:top-3"
          >
            %{product.discountRate} indirim
          </Badge>
        ) : null}
        <div className="absolute right-2.5 top-2.5 z-raised flex flex-col gap-1.5 sm:right-3 sm:top-3">
          <FavoriteButton
            productId={product.id}
            productName={productName}
            className="size-9 border-white/80 bg-white/90 shadow-sm backdrop-blur-md hover:scale-105"
          />
          <ComparisonButton
            productId={product.id}
            productName={productName}
            className="size-9 border-white/80 bg-white/90 shadow-sm backdrop-blur-md hover:scale-105"
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col p-3 sm:p-3.5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
            {product.brand}
          </p>
          <span
            className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${stock.className}`}
          >
            {stock.label}
          </span>
        </div>

        <h2 className="mt-1 line-clamp-2 min-h-9 text-sm font-black leading-[1.125rem] tracking-[-0.03em] text-zinc-950 sm:text-[15px]">
          <Link
            href={`/urun/${product.slug}`}
            className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
          >
            {product.model}
          </Link>
        </h2>
        <p className="mt-1 line-clamp-2 min-h-8 text-[11px] leading-4 text-zinc-500 sm:text-xs">
          {product.description}
        </p>

        <div className="mt-1.5 flex items-center gap-2 text-[10px]">
          <span
            className="flex items-center gap-1 font-bold text-zinc-800"
            aria-label={`${product.rating} puan`}
          >
            <Star
              className="size-3.5 fill-amber-400 text-amber-400"
              aria-hidden="true"
            />
            {product.rating.toFixed(1)}
          </span>
          <span className="text-zinc-400">({product.reviewCount} yorum)</span>
        </div>

        <div className="mt-auto pt-2">
          <div className="min-h-3.5">
            {product.previousPrice ? (
              <p className="text-[11px] font-medium text-zinc-400 line-through">
                {formatCurrency(product.previousPrice)}
              </p>
            ) : null}
          </div>
          <p className="text-xl font-black tracking-[-0.045em] text-zinc-950 sm:text-[22px]">
            {formatCurrency(product.price)}
          </p>
          <p className="mt-1 w-fit rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-medium text-zinc-600">
            <strong className="text-zinc-950">
              {product.installmentCount} ay
            </strong>{" "}
            × {formatCurrency(product.monthlyInstallment)}
          </p>

          <div className="mt-2 flex flex-wrap gap-1">
            {product.freeShipping ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[9px] font-bold text-zinc-700">
                <Truck className="size-3 text-primary" aria-hidden="true" />
                Ücretsiz Kargo
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[9px] font-bold text-zinc-700">
              <ShieldCheck className="size-3 text-primary" aria-hidden="true" />
              Güvenli Ödeme
            </span>
          </div>

          <AddToCartButton
            product={product}
            productId={product.id}
            productName={productName}
            className="relative z-raised mt-2.5 h-9 w-full shadow-[0_10px_24px_rgba(220,38,38,0.18)] transition-[transform,box-shadow] duration-200 active:scale-[0.98] group-hover:-translate-y-0.5 group-hover:shadow-[0_14px_30px_rgba(220,38,38,0.28)]"
          />
        </div>
      </div>
    </Card>
  );
}
