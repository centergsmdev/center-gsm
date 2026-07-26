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
  return <div className="space-y-6">
    <WishlistAlertPreferences productIds={favoriteProducts.map((product) => product.id)} />
    <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
      {favoriteProducts.map((product) => <ProductCard key={product.id} product={product} />)}
    </div>
  </div>;
}
