"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { catalogProducts } from "@/data/catalog-products";
import type { CatalogProduct } from "@/types/product";

const STORAGE_KEY = "center-gsm-demo-comparison";
export const COMPARISON_LIMIT = 4;

type ComparisonContextValue = {
  comparisonIds: string[];
  comparisonProducts: CatalogProduct[];
  count: number;
  isCompared: (productId: string) => boolean;
  toggleComparison: (productId: string) => void;
  removeComparison: (productId: string) => void;
  clearComparison: () => void;
};

const ComparisonContext = createContext<ComparisonContextValue | null>(null);

export function ComparisonProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [comparisonIds, setComparisonIds] = useState<string[]>([]);
  const [announcement, setAnnouncement] = useState("");
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as string[];
        setComparisonIds(parsed.slice(0, COMPARISON_LIMIT));
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    setStorageReady(true);
  }, []);

  useEffect(() => {
    if (storageReady) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(comparisonIds));
    }
  }, [comparisonIds, storageReady]);

  const comparisonProducts = useMemo(
    () =>
      comparisonIds.flatMap((id) => {
        const product = catalogProducts.find(
          (candidate) => candidate.id === id,
        );
        return product ? [product] : [];
      }),
    [comparisonIds],
  );

  function announce(message: string) {
    setAnnouncement("");
    window.setTimeout(() => setAnnouncement(message), 0);
  }

  function removeComparison(productId: string) {
    setComparisonIds((current) => current.filter((id) => id !== productId));
    announce("Ürün karşılaştırma listesinden kaldırıldı.");
  }

  function toggleComparison(productId: string) {
    if (comparisonIds.includes(productId)) {
      removeComparison(productId);
      return;
    }
    if (comparisonIds.length >= COMPARISON_LIMIT) {
      announce("En fazla 4 ürün karşılaştırabilirsiniz.");
      return;
    }
    setComparisonIds((current) => [...current, productId]);
    announce("Ürün karşılaştırma listesine eklendi.");
  }

  const value: ComparisonContextValue = {
    comparisonIds,
    comparisonProducts,
    count: comparisonIds.length,
    isCompared: (productId) => comparisonIds.includes(productId),
    toggleComparison,
    removeComparison,
    clearComparison: () => {
      setComparisonIds([]);
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
