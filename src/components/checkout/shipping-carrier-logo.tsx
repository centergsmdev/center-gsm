type CarrierLogoProps = { providerKey: string; name: string };

const wordmarks = {
  yurtici: { label: "YURTİÇİ KARGO", primary: "#E30613", accent: "#111827" },
  aras: { label: "aras KARGO", primary: "#F58220", accent: "#17365D" },
  mng: { label: "MNG KARGO", primary: "#E30613", accent: "#123A70" },
  surat: { label: "SÜRAT KARGO", primary: "#D71920", accent: "#D71920" },
  ptt: { label: "PTT KARGO", primary: "#FFC400", accent: "#005596" },
  hepsijet: { label: "hepsiJET", primary: "#FF6000", accent: "#5D2E8C" },
} as const;

export function ShippingCarrierLogo({ providerKey, name }: CarrierLogoProps) {
  const key = providerKey.toLocaleLowerCase("tr-TR") as keyof typeof wordmarks;
  const brand = wordmarks[key];
  if (!brand)
    return (
      <span className="text-center text-[10px] font-black text-zinc-700">
        {name}
      </span>
    );
  return (
    <svg
      viewBox="0 0 120 40"
      className="h-8 w-full"
      role="img"
      aria-label={`${name} logosu`}
    >
      <rect x="2" y="6" width="7" height="28" rx="3.5" fill={brand.primary} />
      <rect
        x="11"
        y="10"
        width="4"
        height="20"
        rx="2"
        fill={brand.accent}
        opacity=".9"
      />
      <text
        x="20"
        y="24"
        fill={brand.accent}
        fontFamily="Arial, sans-serif"
        fontSize="12"
        fontWeight="800"
        letterSpacing="-.35"
      >
        {brand.label}
      </text>
      <rect
        x="20"
        y="28"
        width="82"
        height="2.4"
        rx="1.2"
        fill={brand.primary}
        opacity=".92"
      />
    </svg>
  );
}
