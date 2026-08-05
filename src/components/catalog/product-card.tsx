import Link from "next/link";
import { ShieldCheck, Star, Truck } from "lucide-react";
import type { ReactNode } from "react";

import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { ProductVisual } from "@/components/catalog/product-visual";
import { ComparisonButton } from "@/components/comparison/comparison-button";
import { FavoriteButton } from "@/components/favorites/favorite-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  productDisplayName,
  resolveDefaultVariant,
  variantStorageKey,
} from "@/lib/catalog/variants";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CatalogProduct } from "@/types/product";

export function ProductCard({
  product,
  compactMobile = false,
  denseMobile = false,
  footerAction,
}: {
  product: CatalogProduct;
  compactMobile?: boolean;
  denseMobile?: boolean;
  footerAction?: ReactNode;
}) {
  const productName = productDisplayName(product);
  const productTitle = product.variantTitle?.trim() || product.model;
  const defaultVariant = resolveDefaultVariant(
    product.variants ?? [],
    product.colors ?? [],
  );
  const defaultColor = product.colors?.find(
    (color) => color.id === defaultVariant?.colorId,
  );
  const defaultStorage = defaultVariant
    ? variantStorageKey(defaultVariant)
    : undefined;
  const productParams = new URLSearchParams();
  if (defaultColor) productParams.set("color", defaultColor.name);
  if (defaultStorage) productParams.set("storage", defaultStorage);
  const productQuery = productParams.toString();
  const productHref = `/urun/${product.slug}${productQuery ? `?${productQuery}` : ""}`;
  const stock = {
    "in-stock": {
      label: "Stokta",
      className: "bg-emerald-50 text-emerald-700",
    },
    limited: { label: "Sınırlı stok", className: "bg-amber-50 text-amber-700" },
    "out-of-stock": { label: "Tükendi", className: "bg-red-50 text-red-700" },
  }[product.stockStatus];

  return (
    <Card className="home-premium-interactive home-premium-surface group relative flex h-full min-w-0 max-w-full flex-col overflow-hidden border-zinc-200/80 bg-white active:scale-[0.99]">
      <div
        className={cn(
          "relative aspect-square overflow-hidden bg-white [&_span]:hidden",
          compactMobile && "max-sm:aspect-[1.25/1]",
          denseMobile && "max-sm:aspect-[1.4/1]",
        )}
      >
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
            product={product}
            productId={product.id}
            productName={productName}
            className="size-9 border-white/80 bg-white/90 shadow-sm backdrop-blur-md hover:scale-105"
          />
          <ComparisonButton
            product={product}
            productId={product.id}
            productName={productName}
            className="size-9 border-white/80 bg-white/90 shadow-sm backdrop-blur-md hover:scale-105"
          />
        </div>
      </div>

      <div
        className={cn(
          "flex min-w-0 max-w-full flex-1 flex-col overflow-hidden p-2.5 sm:p-3.5",
          compactMobile && "max-sm:p-2",
          denseMobile && "max-sm:p-1.5",
        )}
      >
        <div className="flex min-w-0 items-center justify-between gap-3">
          <p className="min-w-0 truncate text-[10px] font-black uppercase tracking-[0.2em] text-primary">
            {product.brand}
          </p>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${stock.className}`}
          >
            {stock.label}
          </span>
        </div>

        <h2
          className={cn(
            "mt-0.5 line-clamp-2 min-h-8 w-full min-w-0 max-w-full overflow-hidden break-words text-sm font-black leading-4 tracking-[-0.03em] text-zinc-950 sm:mt-1 sm:min-h-9 sm:text-[15px] sm:leading-[1.125rem]",
            denseMobile && "max-sm:min-h-8 max-sm:text-[13px] max-sm:leading-4",
          )}
        >
          <Link
            href={productHref}
            className="block min-w-0 max-w-full overflow-hidden after:absolute after:inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
          >
            {productTitle}
          </Link>
        </h2>
        <p
          className={cn(
            "leading-3.5 mt-0.5 line-clamp-2 min-h-7 min-w-0 max-w-full overflow-hidden break-words text-[10px] text-zinc-500 sm:mt-1 sm:min-h-8 sm:text-xs sm:leading-4",
            denseMobile && "max-sm:leading-3.5 max-sm:mt-0.5 max-sm:min-h-7",
          )}
        >
          {product.shortDescription ?? ""}
        </p>

        <div className="mt-1 flex min-w-0 items-center gap-1.5 overflow-hidden text-[10px] sm:mt-1.5 sm:gap-2">
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
          <span className="min-w-0 truncate text-zinc-400">
            ({product.reviewCount} yorum)
          </span>
        </div>

        <div
          className={cn("mt-auto pt-1.5 sm:pt-2", denseMobile && "max-sm:pt-1")}
        >
          <div className="min-h-3.5">
            {product.previousPrice ? (
              <p className="text-[11px] font-medium text-zinc-400 line-through">
                {formatCurrency(product.previousPrice)}
              </p>
            ) : null}
          </div>
          <p className="text-lg font-black tracking-[-0.045em] text-primary sm:text-[22px] sm:text-zinc-950">
            {formatCurrency(product.price)}
          </p>
          {product.showInstallments ? (
            <p className="mt-0.5 w-fit rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 sm:mt-1 sm:px-2.5 sm:py-1">
              <strong className="text-zinc-950">
                {product.installmentCount} ay
              </strong>{" "}
              × {formatCurrency(product.monthlyInstallment)}
            </p>
          ) : null}

          <div className="mt-1.5 flex flex-wrap gap-1 sm:mt-2">
            {product.freeShipping ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[10px] font-bold text-zinc-700">
                <Truck className="size-3 text-primary" aria-hidden="true" />
                Ücretsiz Kargo
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[10px] font-bold text-zinc-700">
              <ShieldCheck className="size-3 text-primary" aria-hidden="true" />
              Güvenli Ödeme
            </span>
          </div>

          {footerAction ? (
            <div className="relative z-raised mt-1.5 sm:mt-2">
              {footerAction}
            </div>
          ) : null}

          <AddToCartButton
            product={product}
            productId={product.id}
            productName={productName}
            className={cn(
              "relative z-raised mt-2 h-8 w-full shadow-[0_10px_24px_rgba(220,38,38,0.18)] transition-[transform,box-shadow] duration-200 active:scale-[0.98] group-hover:-translate-y-0.5 group-hover:shadow-[0_14px_30px_rgba(220,38,38,0.28)] sm:mt-2.5 sm:h-9",
              compactMobile && "max-sm:mt-1.5 max-sm:h-8",
              denseMobile && "max-sm:mt-1 max-sm:h-8",
            )}
          />
        </div>
      </div>
    </Card>
  );
}
