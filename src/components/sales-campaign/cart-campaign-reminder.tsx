"use client";

import Link from "next/link";
import { CampaignCountdown } from "@/components/sales-campaign/countdown";
import { campaignMatchesProduct } from "@/lib/sales-campaigns";
import { useSalesCampaigns } from "@/providers/sales-campaign-provider";
import type { CartLine } from "@/types/cart";

export function CartCampaignReminder({ lines }: { lines: CartLine[] }) {
  const { campaigns, now } = useSalesCampaigns();
  const campaign = campaigns.find(
    (item) =>
      item.show_cart &&
      lines.some((line) => campaignMatchesProduct(item, line.product)),
  );
  if (!campaign) return null;
  return (
    <aside
      className="mt-4 flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950 sm:flex-row sm:items-center sm:justify-between"
      aria-label="Sepet kampanyası"
    >
      <div>
        <p className="font-black">{campaign.title}</p>
        <p className="mt-1 text-xs">{campaign.description}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <CampaignCountdown
          endsAt={campaign.ends_at}
          now={now}
          className="text-xs font-black tabular-nums"
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
