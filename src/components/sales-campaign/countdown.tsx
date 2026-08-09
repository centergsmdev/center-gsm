"use client";

import { formatCountdown } from "@/lib/sales-campaigns";

export function CampaignCountdown({
  endsAt,
  now,
  className = "",
}: {
  endsAt: string;
  now: number;
  className?: string;
}) {
  if (!now) return null;
  const remaining = new Date(endsAt).getTime() - now;
  if (remaining <= 0) return null;
  return (
    <time
      dateTime={endsAt}
      className={className}
      aria-label={`Kampanyanın bitmesine ${formatCountdown(remaining)} kaldı`}
    >
      {formatCountdown(remaining)}
    </time>
  );
}
