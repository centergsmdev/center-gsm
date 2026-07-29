"use client";

import { useCallback, useEffect, useState } from "react";

import { ProductCard } from "@/components/catalog/product-card";
import { FavoriteAlertButton } from "@/components/favorites/favorite-alert-button";
import { FavoritesEmptyState } from "@/components/favorites/favorites-empty-state";
import { FavoritesErrorState } from "@/components/favorites/favorites-error-state";
import { FavoritesLoadingSkeleton } from "@/components/favorites/favorites-loading-skeleton";
import {
  getWishlistAlertPreferences,
  saveWishlistAlertPreference,
  WISHLIST_ALERT_STORAGE_KEY,
} from "@/lib/wishlist-alerts";
import type { WishlistAlertPreference } from "@/lib/wishlist-alerts";
import { useFavorites } from "@/providers/favorites-provider";

type PreferenceKey = "priceDrop" | "backInStock" | "promotionStarted";

function emptyPreference(productId: string): WishlistAlertPreference {
  return {
    productId,
    priceDrop: false,
    backInStock: false,
    promotionStarted: false,
  };
}

function readStoredPreferences(): WishlistAlertPreference[] {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem(WISHLIST_ALERT_STORAGE_KEY) ?? "[]",
    );
    return Array.isArray(value)
      ? value.filter(
          (item): item is WishlistAlertPreference =>
            typeof item === "object" && item !== null && "productId" in item,
        )
      : [];
  } catch {
    return [];
  }
}

export function FavoritesGrid() {
  const { favoriteProducts, isLoading, error, retry } = useFavorites();
  const [preferences, setPreferences] = useState<WishlistAlertPreference[]>([]);
  const [activeProductId, setActiveProductId] = useState<string | null>(null);
  const [busyProductId, setBusyProductId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    void getWishlistAlertPreferences().then((result) => {
      if (!active) return;
      const stored = readStoredPreferences();
      setPreferences(result.data?.length ? result.data : stored);
    });
    return () => {
      active = false;
    };
  }, []);

  const updatePreference = useCallback(
    async (productId: string, key: PreferenceKey, checked: boolean) => {
      const previous = preferences;
      const current =
        preferences.find((item) => item.productId === productId) ??
        emptyPreference(productId);
      const nextItem = { ...current, [key]: checked };
      const next = [
        ...preferences.filter((item) => item.productId !== productId),
        nextItem,
      ];
      setPreferences(next);
      setBusyProductId(productId);
      setMessage("Alarm tercihi güncelleniyor.");
      localStorage.setItem(WISHLIST_ALERT_STORAGE_KEY, JSON.stringify(next));
      const result = await saveWishlistAlertPreference(nextItem);
      setBusyProductId(null);
      if (result.error) {
        setPreferences(previous);
        localStorage.setItem(
          WISHLIST_ALERT_STORAGE_KEY,
          JSON.stringify(previous),
        );
        setMessage(result.error);
      } else {
        setMessage("Alarm tercihi kaydedildi.");
      }
    },
    [preferences],
  );

  if (isLoading) return <FavoritesLoadingSkeleton />;
  if (error && favoriteProducts.length === 0) {
    return <FavoritesErrorState onRetry={retry} />;
  }
  if (favoriteProducts.length === 0) return <FavoritesEmptyState />;

  return (
    <>
      <div className="stagger-grid grid grid-cols-2 gap-[clamp(0.5rem,2vw,0.75rem)] md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {favoriteProducts.map((product) => {
          const preference =
            preferences.find((item) => item.productId === product.id) ??
            emptyPreference(product.id);
          return (
            <ProductCard
              key={product.id}
              product={product}
              compactMobile
              denseMobile
              footerAction={
                <FavoriteAlertButton
                  productName={`${product.brand} ${product.model}`}
                  preference={preference}
                  open={activeProductId === product.id}
                  onOpen={() => setActiveProductId(product.id)}
                  onClose={() => setActiveProductId(null)}
                  busy={busyProductId === product.id}
                  onChange={(key, checked) =>
                    void updatePreference(product.id, key, checked)
                  }
                />
              }
            />
          );
        })}
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {message}
      </p>
    </>
  );
}
