"use client";

import { Heart } from "lucide-react";

import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/utils";
import { useFavorites } from "@/providers/favorites-provider";

export function FavoriteButton({
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
  const { isFavorite, toggleFavorite } = useFavorites();
  const active = isFavorite(productId);
  return (
    <IconButton
      label={
        active
          ? `${productName} ürününü favorilerden kaldır`
          : `${productName} ürününü favorilere ekle`
      }
      variant="outline"
      size={size}
      aria-pressed={active}
      className={cn(
        "transition-all duration-200",
        active &&
          "border-red-200 bg-red-50 text-primary hover:border-red-300 hover:bg-red-100",
        className,
      )}
      onClick={() => toggleFavorite(productId)}
    >
      <Heart
        className={cn("size-4", active && "fill-current")}
        aria-hidden="true"
      />
    </IconButton>
  );
}
