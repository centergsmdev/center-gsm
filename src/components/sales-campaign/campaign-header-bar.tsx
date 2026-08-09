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
      className="flex flex-col items-center justify-center gap-1 bg-emerald-600 px-2 py-2 text-center text-[10px] font-bold leading-none text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white sm:flex-row sm:gap-0 sm:px-3 sm:text-xs"
    >
      <span className="whitespace-nowrap">{campaign.title}</span>
      <span className="flex min-w-0 items-center justify-center gap-2 whitespace-nowrap sm:contents">
        <CampaignCountdown
          endsAt={campaign.ends_at}
          now={now}
          className="rounded-full bg-black/20 px-2 py-1 tabular-nums sm:ml-2"
        />
        <span className="shrink-0 underline sm:ml-2">{campaign.cta_text}</span>
      </span>
    </Link>
  );
}
