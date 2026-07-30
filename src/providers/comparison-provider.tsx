"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import type { CatalogProduct } from "@/types/product";
import {
  PRODUCT_DELETED_EVENT,
  removeUnavailableProducts,
  subscribeToUnavailableProducts,
} from "@/lib/catalog/deleted-products";

const STORAGE_KEY = "center-gsm-comparison-v2";
export const COMPARISON_LIMIT = 4;

type ComparisonContextValue = {
  comparisonIds: string[];
  comparisonProducts: CatalogProduct[];
  count: number;
  isCompared: (productId: string) => boolean;
  toggleComparison: (product: CatalogProduct) => void;
  removeComparison: (productId: string) => void;
  clearComparison: () => void;
};

const ComparisonContext = createContext<ComparisonContextValue | null>(null);

function isStoredProduct(value: unknown): value is CatalogProduct {
  if (!value || typeof value !== "object") return false;
  const product = value as Partial<CatalogProduct>;
  return (
    typeof product.id === "string" &&
    typeof product.slug === "string" &&
    typeof product.brand === "string" &&
    typeof product.model === "string" &&
    typeof product.price === "number"
  );
}

export function ComparisonProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [announcement, setAnnouncement] = useState("");
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        const parsed: unknown = stored ? JSON.parse(stored) : [];
        if (Array.isArray(parsed)) {
          const available = await removeUnavailableProducts(
            parsed.filter(isStoredProduct),
          );
          if (active) setProducts(available.slice(0, COMPARISON_LIMIT));
        }
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
      if (active) setStorageReady(true);
    })();
    const removeDeleted = (event: Event) => {
      const deleted = (event as CustomEvent<{ id: string; slug: string }>)
        .detail;
      setProducts((current) =>
        current.filter(
          (product) =>
            product.id !== deleted.id && product.slug !== deleted.slug,
        ),
      );
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
  }, []);

  useEffect(() => {
    if (storageReady) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    }
  }, [products, storageReady]);

  const comparisonIds = useMemo(
    () => products.map((product) => product.id),
    [products],
  );

  function announce(message: string) {
    setAnnouncement("");
    window.setTimeout(() => setAnnouncement(message), 0);
  }

  function removeComparison(productId: string) {
    setProducts((current) =>
      current.filter((product) => product.id !== productId),
    );
    announce("Ürün karşılaştırma listesinden kaldırıldı.");
  }

  function toggleComparison(product: CatalogProduct) {
    if (comparisonIds.includes(product.id)) {
      removeComparison(product.id);
      return;
    }
    if (products.length >= COMPARISON_LIMIT) {
      announce("En fazla 4 ürün karşılaştırabilirsiniz.");
      return;
    }
    setProducts((current) => [...current, product]);
    announce("Ürün karşılaştırma listesine eklendi.");
  }

  const value: ComparisonContextValue = {
    comparisonIds,
    comparisonProducts: products,
    count: products.length,
    isCompared: (productId) => comparisonIds.includes(productId),
    toggleComparison,
    removeComparison,
    clearComparison: () => {
      setProducts([]);
      announce("Karşılaştırma listesi temizlendi.");
    },
  };

  return (
    <ComparisonContext.Provider value={value}>
      {children}
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
    </ComparisonContext.Provider>
  );
}

export function useComparison() {
  const context = useContext(ComparisonContext);
  if (!context) {
    throw new Error("useComparison must be used within ComparisonProvider");
  }
  return context;
}
