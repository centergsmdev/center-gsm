"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { CampaignCountdown } from "@/components/sales-campaign/countdown";
import { useSalesCampaigns } from "@/providers/sales-campaign-provider";
import type { SalesCampaign } from "@/types/sales-campaign";

export function CampaignOverlays() {
  const pathname = usePathname();
  const { campaigns, now } = useSalesCampaigns();
  const [open, setOpen] = useState<SalesCampaign | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const excluded =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/odeme") ||
    pathname.startsWith("/giris") ||
    pathname.startsWith("/hesabim");

  const show = useCallback(
    (campaign: SalesCampaign, kind: "popup" | "exit") => {
      const key = `sales-campaign:${kind}:${campaign.id}`;
      if (
        sessionStorage.getItem(key) ||
        document.querySelector('[role="dialog"]')
      )
        return;
      sessionStorage.setItem(key, "1");
      setOpen(campaign);
    },
    [],
  );

  useEffect(() => {
    if (excluded) return;
    const campaign = campaigns.find((item) => item.show_popup);
    if (!campaign) return;
    const timer = window.setTimeout(
      () => show(campaign, "popup"),
      campaign.popup_delay_seconds * 1000,
    );
    return () => window.clearTimeout(timer);
  }, [campaigns, excluded, show]);

  useEffect(() => {
    if (excluded || !window.matchMedia("(pointer: fine)").matches) return;
    const campaign = campaigns.find((item) => item.show_exit_intent);
    if (!campaign) return;
    const onLeave = (event: MouseEvent) => {
      if (event.clientY <= 4) show(campaign, "exit");
    };
    document.addEventListener("mouseout", onLeave);
    return () => document.removeEventListener("mouseout", onLeave);
  }, [campaigns, excluded, show]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(null);
      if (event.key === "Tab") {
        const focusable =
          dialogRef.current?.querySelectorAll<HTMLElement>("button,a[href]");
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[1000] grid place-items-center bg-zinc-950/45 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setOpen(null);
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sales-campaign-title"
        tabIndex={-1}
        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-emerald-300/30 bg-zinc-950 p-6 text-white shadow-2xl outline-none sm:p-8"
      >
        <button
          type="button"
          onClick={() => setOpen(null)}
          aria-label="Kampanyayı kapat"
          className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-white/10 hover:bg-white/20"
        >
          <X aria-hidden="true" />
        </button>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-400">
          {open.campaign_name}
        </p>
        <h2
          id="sales-campaign-title"
          className="mt-3 pr-10 text-3xl font-black"
        >
          {open.title}
        </h2>
        <p className="mt-3 text-sm leading-6 text-zinc-300">
          {open.description}
        </p>
        <CampaignCountdown
          endsAt={open.ends_at}
          now={now}
          className="mt-5 inline-block rounded-full bg-white/10 px-4 py-2 font-black tabular-nums"
        />
        <Link
          href={open.cta_href}
          onClick={() => setOpen(null)}
          className="mt-6 flex min-h-12 items-center justify-center rounded-xl bg-emerald-500 px-5 font-black text-zinc-950 hover:bg-emerald-400"
        >
          {open.cta_text}
        </Link>
      </div>
    </div>
  );
}
