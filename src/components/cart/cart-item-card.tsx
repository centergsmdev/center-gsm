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

export function CartItemCard({ line }: { line: CartLine }) {
  const { product, quantity, lineTotal } = line;
  const { updateQuantity, removeItem } = useCart();
  const { addFavorite } = useFavorites();
  const productName = `${product.brand} ${product.model}`;

  return (
    <Card className="overflow-hidden border-white/80 bg-white/90 p-3 shadow-sm backdrop-blur sm:p-4">
      <div className="flex gap-3 sm:gap-4">
        <Link
          href={`/urun/${product.slug}`}
          aria-label={`${productName} ürün detayını aç`}
          className="size-20 shrink-0 overflow-hidden rounded-md border border-border bg-surface-subtle transition-transform duration-200 hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:size-28"
        >
          <ProductVisual product={product} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted">
                {product.brand}
              </p>
              <h2 className="mt-1 truncate text-sm font-bold sm:text-base">
                <Link
                  href={`/urun/${product.slug}`}
                  className="hover:text-primary"
                >
                  {product.model}
                </Link>
              </h2>
              <p className="mt-1 text-[10px] text-muted sm:text-xs">
                SKU: CG-{product.id.slice(2).padStart(6, "0")}
              </p>
            </div>
            <IconButton
              label={`${productName} ürününü sepetten sil`}
              size="sm"
              variant="ghost"
              onClick={() => removeItem(product.id)}
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </IconButton>
          </div>

          <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              {product.previousPrice ? (
                <p className="text-[11px] text-muted line-through">
                  {formatCurrency(product.previousPrice)}
                </p>
              ) : null}
              <p className="text-base font-black tracking-tight sm:text-lg">
                {formatCurrency(product.price)}
              </p>
              {product.discountRate ? (
                <Badge variant="brand" className="mt-1">
                  %{product.discountRate} indirim
                </Badge>
              ) : null}
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                Ara toplam
              </p>
              <p className="mt-1 text-base font-black tracking-tight sm:text-lg">
                {formatCurrency(lineTotal)}
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex h-10 w-fit items-center rounded-full border border-border bg-surface shadow-xs">
              <IconButton
                label={`${productName} adedini azalt`}
                size="sm"
                onClick={() => updateQuantity(product.id, quantity - 1)}
                disabled={quantity === 1}
              >
                <Minus className="size-3.5" aria-hidden="true" />
              </IconButton>
              <output
                aria-live="polite"
                aria-label={`${productName} adedi`}
                className="min-w-8 text-center text-sm font-bold"
              >
                {quantity}
              </output>
              <IconButton
                label={`${productName} adedini artır`}
                size="sm"
                onClick={() => updateQuantity(product.id, quantity + 1)}
                disabled={quantity === 10}
              >
                <Plus className="size-3.5" aria-hidden="true" />
              </IconButton>
            </div>
            <button
              type="button"
              onClick={() => {
                addFavorite(product.id);
                removeItem(product.id);
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
