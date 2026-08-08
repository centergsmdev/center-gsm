"use client";

import { useSyncExternalStore } from "react";

import { Pagination } from "@/components/catalog/pagination";
import { ProductCard } from "@/components/catalog/product-card";
import { LegacyAndroidCatalogBoundary } from "@/components/catalog/legacy-android-catalog-boundary";
import {
  CatalogEmptyState,
  CatalogErrorState,
} from "@/components/catalog/catalog-states";
import type { CatalogSearchParams } from "@/lib/catalog/params";
import type { CatalogListResult } from "@/lib/catalog/types";

type CatalogViewport = "mobile" | "tablet" | "desktop";

function getViewport(): CatalogViewport {
  if (window.matchMedia("(min-width: 1024px)").matches) return "desktop";
  if (window.matchMedia("(min-width: 640px)").matches) return "tablet";
  return "mobile";
}

function subscribeToViewport(onChange: () => void) {
  const queries = [
    window.matchMedia("(min-width: 640px)"),
    window.matchMedia("(min-width: 1024px)"),
  ];

  for (const query of queries) query.addEventListener("change", onChange);
  return () => {
    for (const query of queries) query.removeEventListener("change", onChange);
  };
}

export function ResponsiveProductResults({
  mobile,
  tablet,
  desktop,
  taxonomyError,
  params,
  basePath,
}: {
  mobile: CatalogListResult;
  tablet: CatalogListResult;
  desktop: CatalogListResult;
  taxonomyError: boolean;
  params: CatalogSearchParams;
  basePath: string;
}) {
  const viewport = useSyncExternalStore(
    subscribeToViewport,
    getViewport,
    () => "mobile",
  );
  const result =
    viewport === "desktop" ? desktop : viewport === "tablet" ? tablet : mobile;
  const hasError = result.error || taxonomyError;
  const totalPages = Math.ceil(result.total / result.pageSize);

  return (
    <LegacyAndroidCatalogBoundary>
      {hasError ? (
        <CatalogErrorState />
      ) : result.data.length === 0 ? (
        <CatalogEmptyState />
      ) : (
        <div className="grid grid-cols-2 gap-[clamp(0.5rem,2vw,0.75rem)] md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {result.data.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              compactMobile
              denseMobile
            />
          ))}
        </div>
      )}
      {!hasError ? (
        <Pagination
          page={result.page}
          totalPages={totalPages}
          basePath={basePath}
          params={params}
        />
      ) : null}
    </LegacyAndroidCatalogBoundary>
  );
}
