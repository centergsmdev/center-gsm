"use client";

import { useState } from "react";
import { Minus, Plus, ShoppingBag, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FavoriteButton } from "@/components/favorites/favorite-button";
import { ComparisonButton } from "@/components/comparison/comparison-button";
import { IconButton } from "@/components/ui/icon-button";
import { useCart } from "@/providers/cart-provider";

export function PurchaseControls({
  product,
  productId,
  productName,
}: {
  product: import("@/types/product").CatalogProduct;
  productId: string;
  productName: string;
}) {
  const [quantity, setQuantity] = useState(1);
  const { addItem } = useCart();
  const maxQuantity = Math.min(10, product.availableStock ?? 10);
  const unavailable = product.stockStatus === "out-of-stock";

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <label
            htmlFor="product-quantity"
            className="text-xs font-bold text-zinc-700"
          >
            Adet
          </label>
          <div className="mt-2 flex h-11 items-center rounded-full border border-border bg-surface shadow-xs">
            <IconButton
              label="Adedi azalt"
              size="sm"
              onClick={() => setQuantity((value) => Math.max(1, value - 1))}
              disabled={quantity === 1}
            >
              <Minus className="size-3.5" aria-hidden="true" />
            </IconButton>
            <output
              id="product-quantity"
              aria-live="polite"
              className="min-w-8 text-center text-sm font-bold"
            >
              {quantity}
            </output>
            <IconButton
              label="Adedi artır"
              size="sm"
              onClick={() => setQuantity((value) => Math.min(maxQuantity, value + 1))}
              disabled={unavailable || quantity >= maxQuantity}
            >
              <Plus className="size-3.5" aria-hidden="true" />
            </IconButton>
          </div>
        </div>
        <div className="flex items-end gap-2">
          <FavoriteButton
            productId={productId}
            productName={productName}
            size="md"
          />
          <ComparisonButton
            productId={productId}
            productName={productName}
            size="md"
          />
        </div>
      </div>
      <Button
        size="lg"
        className="mt-4 w-full shadow-[0_10px_24px_rgba(220,38,38,0.22)] hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(220,38,38,0.3)] active:scale-[0.99]"
        aria-label={`${quantity} adet ${productName} ürününü sepete ekle`}
        onClick={() => addItem(productId, quantity, product)}
        disabled={unavailable}
      >
        <ShoppingBag className="size-4" aria-hidden="true" />
        {unavailable ? "Tükendi" : "Sepete Ekle"}
      </Button>
      <Button
        size="lg"
        variant="secondary"
        className="mt-2 w-full transition-premium active:scale-[0.99]"
        disabled
        aria-disabled="true"
      >
        <Zap className="size-4" aria-hidden="true" />
        Hemen Al
      </Button>
      <p className="mt-3 text-center text-[11px] leading-5 text-muted">
        Hemen Al seçeneği ödeme sistemi aktif olduğunda kullanılabilir.
      </p>
    </div>
  );
}
