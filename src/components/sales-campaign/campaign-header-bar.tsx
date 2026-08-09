"use client";

import Link from "next/link";
import { CampaignCountdown } from "@/components/sales-campaign/countdown";
import { useSalesCampaigns } from "@/providers/sales-campaign-provider";

export function CampaignHeaderBar() {
  const { campaigns, now } = useSalesCampaigns();
  const campaign = campaigns.find((item) => item.show_header);
  if (!campaign) return null;
  return (
    <Link
      href={campaign.cta_href}
      className="block bg-emerald-600 px-3 py-2 text-center text-xs font-bold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
    >
      <span>{campaign.title}</span>
      <CampaignCountdown
        endsAt={campaign.ends_at}
        now={now}
        className="ml-2 rounded-full bg-black/20 px-2 py-1 tabular-nums"
      />
      <span className="ml-2 underline">{campaign.cta_text}</span>
    </Link>
  );
}
