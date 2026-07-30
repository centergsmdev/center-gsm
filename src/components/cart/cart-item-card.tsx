"use client";

import Link from "next/link";
import { Heart, Minus, Plus, Trash2 } from "lucide-react";

import { ProductVisual } from "@/components/catalog/product-visual";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { IconButton } from "@/components/ui/icon-button";
import { formatCurrency } from "@/lib/format";
import { useCart } from "@/providers/cart-provider";
import { useFavorites } from "@/providers/favorites-provider";
import type { CartLine } from "@/types/cart";

export function CartItemCard({
  line,
  onRemove,
}: {
  line: CartLine;
  onRemove: () => void;
}) {
  const { product, quantity, lineTotal, variant } = line;
  const { updateQuantity, removeItem } = useCart();
  const { addFavorite } = useFavorites();
  const productName = `${product.brand} ${product.model}`;
  const maxQuantity = Math.max(1, Math.min(10, product.availableStock ?? 10));

  return (
    <Card className="home-premium-surface overflow-hidden border-white/80 bg-white/95 p-2 shadow-md backdrop-blur transition-shadow hover:shadow-xl sm:p-4">
      <div className="grid min-w-0 grid-cols-[72px_minmax(0,1fr)] gap-2 sm:grid-cols-[120px_minmax(0,1fr)] sm:gap-5">
        <Link
          href={`/urun/${product.slug}`}
          aria-label={`${productName} ürün detayını aç`}
          className="aspect-square w-full overflow-hidden rounded-xl border border-zinc-100 bg-white transition-transform duration-200 hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary [&_span]:hidden"
        >
          <ProductVisual product={product} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted">
                {product.brand}
              </p>
              <h2 className="mt-0.5 line-clamp-2 text-sm font-black leading-4 tracking-[-0.02em] sm:mt-1 sm:text-base sm:leading-normal">
                <Link
                  href={`/urun/${product.slug}`}
                  className="hover:text-primary"
                >
                  {product.model}
                </Link>
              </h2>
              <p className="mt-0.5 text-[9px] text-muted sm:mt-1 sm:text-xs">
                SKU:{" "}
                {variant?.sku ??
                  product.sku ??
                  `CG-${product.id.slice(2).padStart(6, "0")}`}
              </p>
              {variant ? (
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-semibold text-zinc-600 sm:text-xs">
                  {variant.colorName ? (
                    <span>Renk: {variant.colorName}</span>
                  ) : null}
                  {variant.storageValue ? (
                    <span>
                      Depolama: {variant.storageValue} {variant.storageUnit}
                    </span>
                  ) : null}
                  <span>Stok: {variant.stockQuantity}</span>
                </div>
              ) : null}
            </div>
            <IconButton
              label={`${productName} ürününü sepetten sil`}
              size="sm"
              variant="ghost"
              onClick={onRemove}
              className="text-zinc-400 hover:bg-red-50 hover:text-primary"
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </IconButton>
          </div>

          <div className="mt-1.5 grid grid-cols-2 items-end gap-2 sm:mt-3 sm:gap-3">
            <div>
              {product.previousPrice ? (
                <p className="text-[10px] text-zinc-400 line-through sm:text-[11px]">
                  {formatCurrency(product.previousPrice)}
                </p>
              ) : null}
              <p className="text-base font-black tracking-tight text-primary sm:text-lg sm:text-zinc-950">
                {formatCurrency(product.price)}
              </p>
              {product.discountRate ? (
                <Badge variant="brand" className="mt-0.5 sm:mt-1">
                  %{product.discountRate} indirim
                </Badge>
              ) : null}
            </div>
            <div className="min-w-0 text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                Ara toplam
              </p>
              <p className="mt-0.5 truncate text-base font-black tracking-tight text-primary sm:mt-1 sm:text-lg sm:text-zinc-950">
                {formatCurrency(lineTotal)}
              </p>
            </div>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1.5 border-t border-border pt-1.5 sm:mt-3 sm:gap-3 sm:pt-3">
            <div className="flex h-9 w-fit items-center rounded-full border border-border bg-white shadow-xs transition-shadow focus-within:shadow-md sm:h-10">
              <IconButton
                label={`${productName} adedini azalt`}
                size="sm"
                onClick={() => updateQuantity(line.id, quantity - 1)}
                disabled={quantity === 1}
              >
                <Minus className="size-3.5" aria-hidden="true" />
              </IconButton>
              <output
                key={quantity}
                aria-live="polite"
                aria-label={`${productName} adedi`}
                className="animate-in zoom-in min-w-8 text-center text-sm font-black duration-150"
              >
                {quantity}
              </output>
              <IconButton
                label={`${productName} adedini artır`}
                size="sm"
                onClick={() => updateQuantity(line.id, quantity + 1)}
                disabled={quantity >= maxQuantity}
              >
                <Plus className="size-3.5" aria-hidden="true" />
              </IconButton>
            </div>
            <button
              type="button"
              onClick={() => {
                addFavorite(product);
                removeItem(line.id);
              }}
              className="inline-flex w-fit items-center gap-2 rounded-sm text-xs font-semibold text-zinc-600 transition-colors duration-200 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Heart className="size-4" aria-hidden="true" />
              Favorilere taşı
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}
