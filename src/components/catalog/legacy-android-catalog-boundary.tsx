"use client";

import { useEffect, useState, type ReactNode } from "react";

const MINIMUM_SUPPORTED_CHROMIUM_MAJOR = 111;

function requiresLegacyCatalogRendering(userAgent: string) {
  if (!/Android/i.test(userAgent)) return false;

  const chromiumMatch = userAgent.match(/(?:Chrome|Chromium)\/(\d+)/i);
  if (!chromiumMatch) return false;

  return Number(chromiumMatch[1]) < MINIMUM_SUPPORTED_CHROMIUM_MAJOR;
}

export function LegacyAndroidCatalogBoundary({
  children,
}: {
  children: ReactNode;
}) {
  const [legacyRendering, setLegacyRendering] = useState(false);

  useEffect(() => {
    setLegacyRendering(requiresLegacyCatalogRendering(navigator.userAgent));
  }, []);

  return (
    <div
      className={legacyRendering ? "catalog-legacy-rendering" : undefined}
      data-catalog-rendering={legacyRendering ? "legacy" : "standard"}
    >
      {legacyRendering ? (
        <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
          Tarayıcınızın eski bir sürümü kullanılıyor. Ürünler güvenli görünümde
          gösteriliyor; en iyi deneyim için Chrome&apos;u güncelleyin.
        </p>
      ) : null}
      {children}
    </div>
  );
}
