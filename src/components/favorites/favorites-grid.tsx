"use client";

import { ProductCard } from "@/components/catalog/product-card";
import { FavoritesEmptyState } from "@/components/favorites/favorites-empty-state";
import { FavoritesErrorState } from "@/components/favorites/favorites-error-state";
import { FavoritesLoadingSkeleton } from "@/components/favorites/favorites-loading-skeleton";
import { useFavorites } from "@/providers/favorites-provider";
import { WishlistAlertPreferences } from "./wishlist-alert-preferences";

export function FavoritesGrid() {
  const { favoriteProducts, isLoading, error, retry } = useFavorites();
  if (isLoading) return <FavoritesLoadingSkeleton />;
  if (error && favoriteProducts.length === 0)
    return <FavoritesErrorState onRetry={retry} />;
  if (favoriteProducts.length === 0) return <FavoritesEmptyState />;
  return (
    <div className="space-y-6">
      <WishlistAlertPreferences
        productIds={favoriteProducts.map((product) => product.id)}
      />
      <div className="stagger-grid grid grid-cols-2 gap-[clamp(0.5rem,2vw,0.75rem)] md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {favoriteProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            compactMobile
            denseMobile
          />
        ))}
      </div>
    </div>
  );
}
