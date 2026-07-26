import Link from "next/link";
import { PackageCheck, Star, Truck } from "lucide-react";

import { ProductVisual } from "@/components/catalog/product-visual";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { FavoriteButton } from "@/components/favorites/favorite-button";
import { ComparisonButton } from "@/components/comparison/comparison-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import type { CatalogProduct } from "@/types/product";

export function ProductCard({ product }: { product: CatalogProduct }) {
  const productName = `${product.brand} ${product.model}`;
  const stockLabel =
    product.stockStatus === "in-stock"
      ? "Stokta"
      : product.stockStatus === "limited"
        ? "Sınırlı stok"
        : "Tükendi";

  return (
    <Card className="group relative flex h-full flex-col overflow-hidden border-white/70 bg-white/95 shadow-sm transition-[transform,border-color,box-shadow] duration-200 ease-premium hover:-translate-y-1 hover:border-red-200 hover:shadow-[0_18px_45px_rgba(15,23,42,0.13)] active:scale-[0.99]">
      <div className="relative aspect-[5/4] overflow-hidden bg-surface-subtle">
        <ProductVisual product={product} />
        <div className="absolute left-2 top-2 z-raised flex flex-col items-start gap-1 sm:left-3 sm:top-3">
          {product.discountRate ? (
            <Badge variant="brand">%{product.discountRate} indirim</Badge>
          ) : null}
          {product.sameDayShipping ? (
            <Badge variant="dark">
              <PackageCheck className="mr-1 size-3" aria-hidden="true" />
              Aynı gün kargo
            </Badge>
          ) : null}
        </div>
        <div className="absolute right-2 top-2 z-raised flex flex-col gap-1 sm:right-3 sm:top-3">
          <FavoriteButton
            productId={product.id}
            productName={productName}
            className="bg-white/90 backdrop-blur"
          />
          <ComparisonButton
            productId={product.id}
            productName={productName}
            className="bg-white/90 backdrop-blur"
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
          {product.brand}
        </p>
        <h2 className="mt-1 truncate text-sm font-bold leading-5 text-foreground">
          <Link
            href={`/urun/${product.slug}`}
            className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
          >
            {product.model}
          </Link>
        </h2>
        <p className="mt-2 hidden line-clamp-2 text-xs leading-5 text-muted sm:block">
          {product.description}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] sm:text-[11px]">
          <span
            className="flex items-center gap-1"
            aria-label={`${product.rating} puan`}
          >
            <Star
              className="size-3.5 fill-amber-400 text-amber-400"
              aria-hidden="true"
            />
            <strong>{product.rating.toFixed(1)}</strong>
          </span>
          <span className="text-muted">({product.reviewCount} yorum)</span>
          <span
            className={
              product.stockStatus === "limited"
                ? "font-semibold text-amber-700"
                : product.stockStatus === "out-of-stock"
                  ? "font-semibold text-danger"
                  : "font-semibold text-success"
            }
          >
            {stockLabel}
          </span>
        </div>

        <div className="mt-auto pt-3">
          {product.previousPrice ? (
            <p className="text-xs text-muted line-through">
              {formatCurrency(product.previousPrice)}
            </p>
          ) : (
            <div className="h-[18px]" />
          )}
          <p className="text-lg font-black tracking-[-0.035em] text-foreground sm:text-xl">
            {formatCurrency(product.price)}
          </p>
          <p className="mt-1 text-[11px] text-muted">
            {product.installmentCount} ay ×{" "}
            <strong className="text-zinc-700">
              {formatCurrency(product.monthlyInstallment)}
            </strong>
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-semibold text-zinc-600">
            {product.freeShipping ? (
              <span className="inline-flex items-center gap-1">
                <Truck className="size-3.5 text-primary" aria-hidden="true" />
                Ücretsiz kargo
              </span>
            ) : null}
          </div>
          <AddToCartButton
            product={product}
            productId={product.id}
            productName={productName}
            className="relative z-raised mt-3 w-full shadow-sm transition-[transform,box-shadow] active:scale-[0.98]"
          />
        </div>
      </div>
    </Card>
  );
}
