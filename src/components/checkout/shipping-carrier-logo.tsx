"use client";

import { useState } from "react";

type CarrierLogoProps = {
  providerKey: string;
  name: string;
  logoUrl?: string | null;
};

function YurtiçiLogo() {
  return (
    <>
      <path fill="#e30613" d="M7 10h19l-5 5H12l5 5h9l-10 10H7l10-10z" />
      <text x="32" y="20" fill="#e30613" fontSize="11" fontWeight="900">
        YURTİÇİ
      </text>
      <text x="32" y="30" fill="#27272a" fontSize="9" fontWeight="800">
        KARGO
      </text>
    </>
  );
}

function ArasLogo() {
  return (
    <>
      <path
        fill="#f58220"
        d="M7 27 14 9h7l7 18h-6l-1.2-3.5h-7L12.5 27zm8.3-8h4l-2-6z"
      />
      <text x="32" y="23" fill="#f58220" fontSize="17" fontWeight="800">
        aras
      </text>
      <text x="70" y="23" fill="#17365d" fontSize="9" fontWeight="900">
        KARGO
      </text>
    </>
  );
}

function MngLogo() {
  return (
    <>
      <path fill="#e30613" d="M6 10h5l5 8 5-8h5v20h-5V18l-5 8-5-8v12H6z" />
      <text x="31" y="24" fill="#123a70" fontSize="16" fontWeight="900">
        MNG
      </text>
      <text x="68" y="24" fill="#e30613" fontSize="9" fontWeight="900">
        KARGO
      </text>
    </>
  );
}

function HepsijetLogo() {
  return (
    <>
      <path fill="#ff6000" d="M7 9h6v7h7V9h6v22h-6v-9h-7v9H7z" />
      <text x="32" y="24" fill="#ff6000" fontSize="14" fontWeight="800">
        hepsi
      </text>
      <text x="67" y="24" fill="#5d2e8c" fontSize="14" fontWeight="900">
        JET
      </text>
    </>
  );
}

function PttLogo() {
  return (
    <>
      <path fill="#ffc400" d="M6 8h25v24H6z" />
      <path fill="#005596" d="M10 13h17v4H15v3h10v4H15v4h-5z" />
      <text x="37" y="24" fill="#005596" fontSize="15" fontWeight="900">
        PTT KARGO
      </text>
    </>
  );
}

function SuratLogo() {
  return (
    <>
      <path fill="#d71920" d="M6 11h21l-4 5H12l4 3h7l-9 10H6l9-9z" />
      <text x="32" y="22" fill="#d71920" fontSize="14" fontWeight="900">
        SÜRAT
      </text>
      <text x="32" y="30" fill="#27272a" fontSize="7" fontWeight="800">
        KARGO
      </text>
    </>
  );
}

const logos = {
  yurtici: YurtiçiLogo,
  aras: ArasLogo,
  mng: MngLogo,
  hepsijet: HepsijetLogo,
  ptt: PttLogo,
  surat: SuratLogo,
} as const;

export function ShippingCarrierLogo({
  providerKey,
  name,
  logoUrl,
}: CarrierLogoProps) {
  const normalizedLogoUrl = logoUrl?.trim() || null;
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  if (normalizedLogoUrl && failedUrl !== normalizedLogoUrl) {
    return (
      // The URL is admin-managed and can use any HTTPS image host.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={normalizedLogoUrl}
        alt={`${name} logosu`}
        loading="lazy"
        decoding="async"
        className="h-8 w-full object-contain"
        onError={() => setFailedUrl(normalizedLogoUrl)}
      />
    );
  }

  const key = providerKey.toLocaleLowerCase("tr-TR") as keyof typeof logos;
  const Logo = logos[key];
  if (!Logo) {
    return (
      <span className="text-center text-[10px] font-black text-zinc-700">
        {name}
      </span>
    );
  }
  return (
    <svg
      viewBox="0 0 120 40"
      className="h-8 w-full"
      role="img"
      aria-label={`${name} logosu`}
      preserveAspectRatio="xMidYMid meet"
    >
      <Logo />
    </svg>
  );
}
