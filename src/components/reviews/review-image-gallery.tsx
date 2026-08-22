"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

import { getReviewImageUrl } from "@/lib/reviews/images";
import { cn } from "@/lib/utils";

export function ReviewImageGallery({
  paths,
  compact = false,
}: {
  paths: string[];
  compact?: boolean;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const urls = paths.map(getReviewImageUrl).filter(Boolean);

  const close = useCallback(() => {
    const previousIndex = activeIndex;
    setActiveIndex(null);
    if (previousIndex !== null)
      window.requestAnimationFrame(() =>
        triggerRefs.current[previousIndex]?.focus(),
      );
  }, [activeIndex]);

  useEffect(() => {
    if (activeIndex === null) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowLeft")
        setActiveIndex((index) =>
          index === null ? null : (index - 1 + urls.length) % urls.length,
        );
      if (event.key === "ArrowRight")
        setActiveIndex((index) =>
          index === null ? null : (index + 1) % urls.length,
        );
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLButtonElement>("button"),
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable.at(-1) ?? first;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeIndex, close, urls.length]);

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
            ref={(element) => {
              triggerRefs.current[index] = element;
            }}
            type="button"
            onClick={() => setActiveIndex(index)}
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
      {activeIndex !== null ? (
        <div
          ref={dialogRef}
          className="fixed inset-0 z-[100] grid place-items-center bg-black/85 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="review-lightbox-title"
          onClick={close}
        >
          <h2 id="review-lightbox-title" className="sr-only">
            Müşteri yorum görseli
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={close}
            className="absolute right-4 top-4 grid size-11 place-items-center rounded-full bg-white text-zinc-950 shadow-lg"
            aria-label="Görseli kapat"
          >
            <X className="size-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={urls[activeIndex]}
            alt={`Büyütülmüş müşteri yorum görseli ${activeIndex + 1}`}
            className="max-h-[88vh] max-w-[94vw] rounded-2xl object-contain"
            onClick={(event) => event.stopPropagation()}
          />
          {urls.length > 1 ? (
            <>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setActiveIndex((activeIndex - 1 + urls.length) % urls.length);
                }}
                className="absolute left-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white text-zinc-950 shadow-lg sm:left-6"
                aria-label="Önceki görsel"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setActiveIndex((activeIndex + 1) % urls.length);
                }}
                className="absolute right-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white text-zinc-950 shadow-lg sm:right-6"
                aria-label="Sonraki görsel"
              >
                <ChevronRight className="size-5" />
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
