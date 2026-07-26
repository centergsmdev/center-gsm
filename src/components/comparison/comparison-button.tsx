"use client";

import { Check, GitCompareArrows } from "lucide-react";

import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/utils";
import {
  COMPARISON_LIMIT,
  useComparison,
} from "@/providers/comparison-provider";

export function ComparisonButton({
  productId,
  productName,
  size = "sm",
  className,
}: {
  productId: string;
  productName: string;
  size?: "sm" | "md";
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
      onClick={() => toggleComparison(productId)}
      className={cn(
        "relative z-raised",
        active && "border-zinc-950 bg-zinc-950 text-white hover:bg-zinc-800",
        limitReached && "opacity-60",
        className,
      )}
    >
      {active ? (
        <Check className="size-4" aria-hidden="true" />
      ) : (
        <GitCompareArrows className="size-4" aria-hidden="true" />
      )}
    </IconButton>
  );
}
