"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { getReviewImageUrl } from "@/lib/reviews/images";
import { cn } from "@/lib/utils";

export function ReviewImageGallery({
  paths,
  compact = false,
}: {
  paths: string[];
  compact?: boolean;
}) {
  const [active, setActive] = useState<string | null>(null);
  const urls = paths.map(getReviewImageUrl).filter(Boolean);

  useEffect(() => {
    if (!active) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActive(null);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [active]);

  if (!urls.length) return null;
  return (
    <>
      <div
        className={cn(
          "grid gap-2",
          compact ? "mt-2 grid-cols-3" : "mt-4 grid-cols-3 sm:max-w-xl",
        )}
      >
        {urls.map((url, index) => (
          <button
            key={url}
            type="button"
            onClick={() => setActive(url)}
            className={cn(
              "overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
              compact ? "size-12" : "aspect-square",
            )}
            aria-label={`${index + 1}. yorum görselini büyüt`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`Müşteri yorum görseli ${index + 1}`}
              loading="lazy"
              className="size-full object-cover transition hover:scale-105"
            />
          </button>
        ))}
      </div>
      {active ? (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-black/85 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Yorum görseli"
          onClick={() => setActive(null)}
        >
          <button
            type="button"
            onClick={() => setActive(null)}
            className="absolute right-4 top-4 grid size-11 place-items-center rounded-full bg-white text-zinc-950 shadow-lg"
            aria-label="Görseli kapat"
          >
            <X className="size-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={active}
            alt="Büyütülmüş müşteri yorum görseli"
            className="max-h-[88vh] max-w-[94vw] rounded-2xl object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ) : null}
    </>
  );
}
