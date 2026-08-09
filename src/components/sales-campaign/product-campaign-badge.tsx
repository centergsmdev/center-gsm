"use client";

import { useProductSalesCampaign } from "@/providers/sales-campaign-provider";
import type { CatalogProduct } from "@/types/product";

const labels = {
  limited: "Sınırlı Süre",
  ends_today: "Bugün Bitiyor",
  opportunity: "Kampanyalı Ürün",
} as const;

export function ProductCampaignBadge({ product }: { product: CatalogProduct }) {
  const { campaign } = useProductSalesCampaign(product);
  const badge = campaign?.show_badges ? campaign.badge_types[0] : undefined;
  if (!badge) return null;
  return (
    <span className="absolute bottom-2.5 left-2.5 z-raised rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-black text-white shadow-lg">
      {labels[badge]}
    </span>
  );
}
