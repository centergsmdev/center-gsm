"use client";

import { useEffect, useState } from "react";

import { ProductRecommendations } from "@/components/product-detail/product-recommendations";
import type { CatalogProduct } from "@/types/product";

const STORAGE_KEY = "center-gsm-recently-viewed-products";
const MAX_STORED_PRODUCTS = 8;

export function RecentlyViewedProducts({
  product,
}: {
  product: CatalogProduct;
}) {
  const [recentProducts, setRecentProducts] = useState<CatalogProduct[]>([]);

  useEffect(() => {
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

    setRecentProducts(
      storedProducts.filter((item) => item.id !== product.id).slice(0, 4),
    );
    const next = [
      product,
      ...storedProducts.filter((item) => item.id !== product.id),
    ].slice(0, MAX_STORED_PRODUCTS);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ürün sayfası, tarayıcı depolaması kullanılamadığında da çalışır.
    }
  }, [product]);

  return (
    <ProductRecommendations
      eyebrow="Keşfetmeye devam edin"
      title="Son görüntülenen ürünler"
      products={recentProducts}
    />
  );
}
