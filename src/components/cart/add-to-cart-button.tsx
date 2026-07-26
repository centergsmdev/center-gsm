"use client";

import { ShoppingBag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useCart } from "@/providers/cart-provider";

export function AddToCartButton({
  product,
  productId,
  productName,
  quantity = 1,
  className,
}: {
  product?: import("@/types/product").CatalogProduct;
  productId: string;
  productName: string;
  quantity?: number;
  className?: string;
}) {
  const { addItem } = useCart();
  const unavailable = product?.stockStatus === "out-of-stock";
  return (
    <Button
      className={className}
      size="md"
      aria-label={`${productName} ürününü sepete ekle`}
      onClick={() => addItem(productId, quantity, product)}
      disabled={unavailable}
    >
      <ShoppingBag className="size-4" aria-hidden="true" />
      {unavailable ? "Tükendi" : "Sepete Ekle"}
    </Button>
  );
}
