"use client";

import { useEffect, useState, type ReactNode } from "react";

type ChromiumVersion = readonly [
  major: number,
  minor: number,
  build: number,
  patch: number,
];

type CatalogRenderingMode = "SAFE" | "STANDARD";

const VERIFIED_AFFECTED_CHROME_BUILDS: readonly ChromiumVersion[] = [
  [126, 0, 6478, 71],
  [149, 0, 7827, 114],
];

function parseAndroidChromeVersion(userAgent: string): ChromiumVersion | null {
  if (!/Android/i.test(userAgent)) return null;

  const match = userAgent.match(/\bChrome\/(\d+)\.(\d+)\.(\d+)\.(\d+)\b/i);
  if (!match) return null;

  return [
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
    Number(match[4]),
  ];
}

function compareChromiumVersions(
  left: ChromiumVersion,
  right: ChromiumVersion,
) {
  for (let index = 0; index < left.length; index += 1) {
    const difference = left[index] - right[index];
    if (difference !== 0) return difference;
  }

  return 0;
}

function isVerifiedAffectedBuild(version: ChromiumVersion | null) {
  if (!version) return false;

  return VERIFIED_AFFECTED_CHROME_BUILDS.some(
    (affectedVersion) =>
      compareChromiumVersions(version, affectedVersion) === 0,
  );
}

function getForcedMode(search: string): CatalogRenderingMode | null {
  const override = new URLSearchParams(search).get("catalogSafeMode");

  if (override === "1") return "SAFE";
  if (override === "0") return "STANDARD";
  return null;
}

function formatVersion(version: ChromiumVersion | null) {
  return version?.join(".") ?? "unknown";
}

export function LegacyAndroidCatalogBoundary({
  children,
}: {
  children: ReactNode;
}) {
  const [mode, setMode] = useState<CatalogRenderingMode>("STANDARD");

  useEffect(() => {
    const version = parseAndroidChromeVersion(navigator.userAgent);
    const forcedMode = getForcedMode(window.location.search);
    const resolvedMode =
      forcedMode ?? (isVerifiedAffectedBuild(version) ? "SAFE" : "STANDARD");

    setMode(resolvedMode);

    if (process.env.NODE_ENV !== "production") {
      console.info("[Catalog rendering]", {
        browser: version ? "Chrome" : "Other",
        version: formatVersion(version),
        platform: /Android/i.test(navigator.userAgent) ? "Android" : "Other",
        mode: resolvedMode,
        source: forcedMode ? "query override" : "automatic compatibility",
      });
    }
  }, []);

  const safeRendering = mode === "SAFE";

  return (
    <div
      className={safeRendering ? "catalog-safe-rendering" : undefined}
      data-catalog-rendering={safeRendering ? "safe" : "standard"}
    >
      {children}
    </div>
  );
}
