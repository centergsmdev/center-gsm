"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { BellRing, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { WishlistAlertPreference } from "@/lib/wishlist-alerts";

type PreferenceKey = "priceDrop" | "backInStock" | "promotionStarted";

const options: Array<{ key: PreferenceKey; label: string }> = [
  { key: "priceDrop", label: "Fiyat düştüğünde haber ver" },
  { key: "backInStock", label: "Stoğa girince haber ver" },
  { key: "promotionStarted", label: "Kampanyaya girince haber ver" },
];

export function FavoriteAlertButton({
  productName,
  preference,
  open,
  onOpen,
  onClose,
  onChange,
  busy,
}: {
  productName: string;
  preference: WishlistAlertPreference;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onChange: (key: PreferenceKey, checked: boolean) => void;
  busy: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open]);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 w-full border-zinc-200 bg-zinc-50 px-3 text-[11px] shadow-none hover:border-red-200 hover:bg-red-50 hover:text-primary"
        onClick={onOpen}
      >
        <BellRing className="size-3.5" aria-hidden="true" />
        Favori Alarmı
      </Button>
      {open
        ? createPortal(
            <div
              className="fixed inset-0 z-modal grid items-end bg-zinc-950/45 backdrop-blur-sm sm:place-items-center sm:p-6"
              role="presentation"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
              }}
            >
              <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="favorite-alert-title"
                className="w-full rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-3xl sm:p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                      {productName}
                    </p>
                    <h2
                      id="favorite-alert-title"
                      className="mt-1 text-xl font-black tracking-[-0.035em]"
                    >
                      Favori Alarmı
                    </h2>
                    <p className="mt-1 text-xs leading-5 text-muted">
                      Bildirim almak istediğiniz değişiklikleri seçin.
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label="Favori alarmını kapat"
                    onClick={onClose}
                    className="grid size-10 shrink-0 place-items-center rounded-full border border-zinc-200 transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                </div>
                <div className="mt-5 space-y-2">
                  {options.map((option) => (
                    <label
                      key={option.key}
                      className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-sm font-bold transition-colors hover:border-red-200 hover:bg-red-50/50"
                    >
                      <span>{option.label}</span>
                      <input
                        type="checkbox"
                        role="switch"
                        checked={preference[option.key]}
                        disabled={busy}
                        onChange={(event) =>
                          onChange(option.key, event.target.checked)
                        }
                        className="size-5 accent-red-700"
                      />
                    </label>
                  ))}
                </div>
                <Button
                  className="mt-5 w-full"
                  onClick={onClose}
                  disabled={busy}
                >
                  Tamam
                </Button>
              </section>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
