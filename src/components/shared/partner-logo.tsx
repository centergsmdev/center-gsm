"use client";

import { useState } from "react";

export function PartnerLogo({
  name,
  logoUrl,
  className = "h-10 w-14",
}: {
  name: string;
  logoUrl?: string | null;
  className?: string;
}) {
  const normalizedLogoUrl = logoUrl?.trim() || null;
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  if (normalizedLogoUrl && failedUrl !== normalizedLogoUrl) {
    return (
      // Partner URLs are admin-managed and can use any HTTPS image host.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={normalizedLogoUrl}
        alt={`${name} logosu`}
        loading="lazy"
        decoding="async"
        className={`${className} object-contain`}
        onError={() => setFailedUrl(normalizedLogoUrl)}
      />
    );
  }

  return (
    <span className="max-w-14 text-center text-[10px] font-black leading-tight text-zinc-700">
      {name}
    </span>
  );
}
