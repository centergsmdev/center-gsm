"use client";

import { useState } from "react";
import { Minus, Plus, ShoppingBag, Zap } from "lucide-react";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
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
              onClick={() =>
                setQuantity((value) => Math.min(maxQuantity, value + 1))
              }
              disabled={unavailable || quantity >= maxQuantity}
            >
              <Plus className="size-3.5" aria-hidden="true" />
            </IconButton>
          </div>
        </div>
      </div>
      <div className="sticky bottom-0 z-raised -mx-4 mt-4 border-t border-zinc-100 bg-white/95 p-4 shadow-[0_-12px_32px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="lg"
            className="w-full shadow-[0_10px_24px_rgba(220,38,38,0.22)] hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(220,38,38,0.3)] active:scale-[0.99]"
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
            className="transition-premium w-full active:scale-[0.99]"
            disabled={unavailable}
            onClick={() => {
              addItem(productId, quantity, product);
              router.push("/odeme");
            }}
          >
            <Zap className="size-4" aria-hidden="true" />
            Hemen Satın Al
          </Button>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <FavoriteButton
            product={product}
            productId={productId}
            productName={productName}
            size="md"
            showLabel
            className="w-full justify-center rounded-full"
          />
          <ComparisonButton
            product={product}
            productId={productId}
            productName={productName}
            size="md"
            showLabel
            className="w-full justify-center rounded-full"
          />
        </div>
      </div>
    </div>
  );
}
