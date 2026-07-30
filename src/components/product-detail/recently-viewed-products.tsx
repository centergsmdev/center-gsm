"use client";

import { useEffect, useState } from "react";

import { ProductRecommendations } from "@/components/product-detail/product-recommendations";
import type { CatalogProduct } from "@/types/product";
import {
  PRODUCT_DELETED_EVENT,
  removeUnavailableProducts,
  subscribeToUnavailableProducts,
} from "@/lib/catalog/deleted-products";

const STORAGE_KEY = "center-gsm-recently-viewed-products";
const MAX_STORED_PRODUCTS = 8;

export function RecentlyViewedProducts({
  product,
}: {
  product: CatalogProduct;
}) {
  const [recentProducts, setRecentProducts] = useState<CatalogProduct[]>([]);

  useEffect(() => {
    let active = true;
    let storedProducts: CatalogProduct[] = [];
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      const parsed: unknown = stored ? JSON.parse(stored) : [];
      if (Array.isArray(parsed)) {
        storedProducts = parsed.filter(
          (item): item is CatalogProduct =>
            typeof item === "object" &&
            item !== null &&
            "id" in item &&
            "slug" in item,
        );
      }
    } catch {
      storedProducts = [];
    }

    void removeUnavailableProducts(storedProducts).then((available) => {
      if (!active) return;
      setRecentProducts(
        available.filter((item) => item.id !== product.id).slice(0, 4),
      );
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(
          [
            product,
            ...available.filter((item) => item.id !== product.id),
          ].slice(0, MAX_STORED_PRODUCTS),
        ),
      );
    });
    const next = [
      product,
      ...storedProducts.filter((item) => item.id !== product.id),
    ].slice(0, MAX_STORED_PRODUCTS);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ürün sayfası, tarayıcı depolaması kullanılamadığında da çalışır.
    }
    const removeDeleted = (event: Event) => {
      const deleted = (event as CustomEvent<{ id: string; slug: string }>)
        .detail;
      setRecentProducts((current) =>
        current.filter(
          (item) => item.id !== deleted.id && item.slug !== deleted.slug,
        ),
      );
      try {
        const stored: unknown = JSON.parse(
          window.localStorage.getItem(STORAGE_KEY) ?? "[]",
        );
        if (Array.isArray(stored))
          window.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(
              stored.filter(
                (item) =>
                  typeof item === "object" &&
                  item !== null &&
                  "id" in item &&
                  "slug" in item &&
                  item.id !== deleted.id &&
                  item.slug !== deleted.slug,
              ),
            ),
          );
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    };
    const unsubscribe = subscribeToUnavailableProducts((deleted) =>
      removeDeleted(
        new CustomEvent(PRODUCT_DELETED_EVENT, { detail: deleted }),
      ),
    );
    return () => {
      active = false;
      unsubscribe();
    };
  }, [product]);

  return (
    <ProductRecommendations
      eyebrow="Keşfetmeye devam edin"
      title="Son görüntülenen ürünler"
      products={recentProducts}
    />
  );
}
