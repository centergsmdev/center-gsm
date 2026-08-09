"use client";

import Link from "next/link";
import { CampaignCountdown } from "@/components/sales-campaign/countdown";
import { useProductSalesCampaign } from "@/providers/sales-campaign-provider";
import type { CatalogProduct } from "@/types/product";

export function ProductCampaignPanel({ product }: { product: CatalogProduct }) {
  const { campaign, now } = useProductSalesCampaign(product);
  if (!campaign?.show_product_detail) return null;
  return (
    <aside
      className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950"
      aria-label="Ürüne özel kampanya"
    >
      <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
        {campaign.campaign_name}
      </p>
      <h2 className="mt-1 text-lg font-black">{campaign.title}</h2>
      <p className="mt-1 text-sm leading-5">{campaign.description}</p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <CampaignCountdown
          endsAt={campaign.ends_at}
          now={now}
          className="font-black tabular-nums"
        />
        <Link
          href={campaign.cta_href}
          className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-black text-white"
        >
          {campaign.cta_text}
        </Link>
      </div>
    </aside>
  );
}
