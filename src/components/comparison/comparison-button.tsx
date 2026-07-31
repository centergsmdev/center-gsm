"use client";

import { Check, GitCompareArrows } from "lucide-react";

import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/utils";
import {
  COMPARISON_LIMIT,
  useComparison,
} from "@/providers/comparison-provider";

export function ComparisonButton({
  product,
  productId,
  productName,
  size = "sm",
  showLabel = false,
  className,
}: {
  product: import("@/types/product").CatalogProduct;
  productId: string;
  productName: string;
  size?: "sm" | "md";
  showLabel?: boolean;
  className?: string;
}) {
  const { count, isCompared, toggleComparison } = useComparison();
  const active = isCompared(productId);
  const limitReached = count >= COMPARISON_LIMIT && !active;

  return (
    <IconButton
      label={
        active
          ? `${productName} ürününü karşılaştırmadan kaldır`
          : limitReached
            ? "Karşılaştırma limiti dolu"
            : `${productName} ürününü karşılaştır`
      }
      title={
        limitReached ? "En fazla 4 ürün karşılaştırabilirsiniz" : undefined
      }
      variant="outline"
      size={size}
      aria-pressed={active}
      onClick={() => toggleComparison(product)}
      className={cn(
        "storefront-icon-action relative z-raised transition-all duration-200 motion-reduce:transform-none motion-reduce:transition-none",
        active && "border-zinc-950 bg-zinc-950 text-white hover:bg-zinc-800",
        limitReached && "opacity-60",
        showLabel && "w-auto grid-flow-col gap-2 px-4",
        className,
      )}
    >
      {active ? (
        <Check className="size-4" aria-hidden="true" />
      ) : (
        <GitCompareArrows className="size-4" aria-hidden="true" />
      )}
      {showLabel ? (
        <span>{active ? "Karşılaştırmadan Çıkar" : "Karşılaştır"}</span>
      ) : null}
    </IconButton>
  );
}
