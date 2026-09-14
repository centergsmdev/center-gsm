"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, X } from "lucide-react";

import {
  buildWhatsAppHref,
  formatWhatsAppPhone,
  representativeInitials,
} from "@/lib/contact/whatsapp";
import type { WhatsAppRepresentative } from "@/types/database";

type Representative = Pick<
  WhatsAppRepresentative,
  "id" | "full_name" | "title" | "phone_e164" | "photo_url"
>;

export function WhatsAppRepresentativeLauncher({
  representatives,
  fallbackHref,
}: {
  representatives: Representative[];
  fallbackHref: string | null;
}) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const buttonClass =
    "fixed bottom-[76px] right-4 z-[999] flex h-12 items-center gap-2 rounded-full bg-[#25D366] px-4 text-sm font-bold text-white shadow-xl transition hover:bg-[#1fb85a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2 sm:bottom-[84px] sm:right-6";

  if (!representatives.length && fallbackHref) {
    return (
      <a
        href={fallbackHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="WhatsApp ile iletişime geç"
        className={buttonClass}
      >
        <MessageCircle className="size-5" aria-hidden="true" />
        WhatsApp
      </a>
    );
  }

  if (!representatives.length) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={buttonClass}
      >
        <MessageCircle className="size-5" aria-hidden="true" />
        WhatsApp
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[1100] grid place-items-end bg-zinc-950/60 p-0 backdrop-blur-sm sm:place-items-center sm:p-5"
          role="presentation"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setOpen(false)
          }
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="whatsapp-representative-title"
            className="max-h-[calc(100dvh-1rem)] w-full overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:max-w-xl sm:rounded-[28px]"
          >
            <header className="relative bg-zinc-950 px-6 pb-6 pt-7 text-white sm:px-8">
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Pencereyi kapat"
                className="absolute right-5 top-5 grid size-11 place-items-center rounded-full border border-white/20 text-zinc-200 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
              <p className="pr-14 text-xs font-black uppercase tracking-[0.22em] text-red-500">
                CENTER GSM İletişim
              </p>
              <h2
                id="whatsapp-representative-title"
                className="mt-2 pr-14 text-2xl font-black tracking-tight sm:text-3xl"
              >
                WhatsApp temsilcinizi seçin
              </h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-zinc-300">
                Size yardımcı olmasını istediğiniz müşteri temsilcisine doğrudan
                ulaşabilirsiniz.
              </p>
            </header>

            <div className="max-h-[min(60dvh,520px)] space-y-3 overflow-y-auto bg-zinc-50 p-4 sm:p-6">
              {representatives.map((representative) => {
                const href = buildWhatsAppHref(representative.phone_e164);
                if (!href) return null;
                return (
                  <a
                    key={representative.id}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setOpen(false)}
                    className="group flex min-h-24 items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                    aria-label={`${representative.full_name} ile WhatsApp üzerinden iletişime geç`}
                  >
                    <RepresentativeAvatar representative={representative} />
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate text-base font-black text-zinc-950 sm:text-lg">
                        {representative.full_name}
                      </strong>
                      <span className="mt-0.5 block truncate text-xs font-semibold text-zinc-500 sm:text-sm">
                        {representative.title}
                      </span>
                      <span className="mt-1 block text-sm font-bold text-zinc-700">
                        {formatWhatsAppPhone(representative.phone_e164)}
                      </span>
                    </span>
                    <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[#25D366] text-white shadow-sm transition group-hover:scale-105 group-hover:bg-[#1fb85a]">
                      <MessageCircle className="size-6" aria-hidden="true" />
                    </span>
                  </a>
                );
              })}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

function RepresentativeAvatar({
  representative,
}: {
  representative: Representative;
}) {
  return (
    <span
      className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-white bg-zinc-900 bg-cover bg-center text-lg font-black text-white shadow ring-1 ring-zinc-200"
      style={
        representative.photo_url
          ? {
              backgroundImage: `url(${JSON.stringify(representative.photo_url)})`,
            }
          : undefined
      }
      aria-hidden="true"
    >
      {representative.photo_url
        ? null
        : representativeInitials(representative.full_name)}
    </span>
  );
}
