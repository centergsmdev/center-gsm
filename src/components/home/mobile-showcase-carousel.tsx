"use client";

import {
  Children,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { StaggerContainer } from "@/components/motion/motion-system";

const AUTOPLAY_DELAY = 2000;
const INTERACTION_RESUME_DELAY = 3000;
const SCROLL_SETTLE_DELAY = 180;

export function HomepageProductCarousel({ children }: { children: ReactNode }) {
  const items = Children.toArray(children);
  const loopItems =
    items.length > 1
      ? Array.from({ length: 4 }, (_, index) => items[index % items.length])
      : [];
  const carouselRef = useRef<HTMLDivElement>(null);
  const activeIndexRef = useRef(0);
  const autoplayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resumeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isVisibleRef = useRef(false);

  const stopAutoplay = useCallback(() => {
    if (autoplayRef.current) clearInterval(autoplayRef.current);
    autoplayRef.current = null;
  }, []);

  const normalizeLoopPosition = useCallback(() => {
    const carousel = carouselRef.current;
    if (!carousel || items.length < 2) return;

    const carouselItems = Array.from(
      carousel.querySelectorAll<HTMLElement>("[data-showcase-item]"),
    );
    const nearestIndex = carouselItems.reduce((nearest, item, index) => {
      const nearestDistance = Math.abs(
        carouselItems[nearest].offsetLeft - carousel.scrollLeft,
      );
      const itemDistance = Math.abs(item.offsetLeft - carousel.scrollLeft);
      return itemDistance < nearestDistance ? index : nearest;
    }, 0);

    if (nearestIndex >= items.length) {
      const normalizedIndex = nearestIndex - items.length;
      const normalizedItem = carouselItems[normalizedIndex];
      carousel.scrollTo({ left: normalizedItem.offsetLeft, behavior: "auto" });
      activeIndexRef.current = normalizedIndex;
      return;
    }

    activeIndexRef.current = nearestIndex;
  }, [items.length]);

  const advance = useCallback(() => {
    const carousel = carouselRef.current;
    if (!carousel || items.length < 2) return;

    const carouselItems = Array.from(
      carousel.querySelectorAll<HTMLElement>("[data-showcase-item]"),
    );
    const nextIndex = activeIndexRef.current + 1;
    const nextItem = carouselItems[nextIndex];
    if (!nextItem) return;

    activeIndexRef.current = nextIndex;
    carousel.scrollTo({ left: nextItem.offsetLeft, behavior: "smooth" });
  }, [items.length]);

  const goBack = useCallback(() => {
    const carousel = carouselRef.current;
    if (!carousel || items.length < 2) return;

    const carouselItems = Array.from(
      carousel.querySelectorAll<HTMLElement>('[data-showcase-item="original"]'),
    );
    const previousIndex =
      activeIndexRef.current > 0
        ? activeIndexRef.current - 1
        : carouselItems.length - 1;
    const previousItem = carouselItems[previousIndex];
    if (!previousItem) return;

    activeIndexRef.current = previousIndex;
    carousel.scrollTo({ left: previousItem.offsetLeft, behavior: "smooth" });
  }, [items.length]);

  const startAutoplay = useCallback(() => {
    stopAutoplay();
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (
      !isVisibleRef.current ||
      document.visibilityState !== "visible" ||
      reducedMotion ||
      items.length < 2
    )
      return;

    autoplayRef.current = setInterval(advance, AUTOPLAY_DELAY);
  }, [advance, items.length, stopAutoplay]);

  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    const handleScroll = () => {
      if (settleRef.current) clearTimeout(settleRef.current);
      settleRef.current = setTimeout(
        normalizeLoopPosition,
        SCROLL_SETTLE_DELAY,
      );
    };
    const handleDocumentVisibility = () => {
      if (document.visibilityState === "visible") startAutoplay();
      else stopAutoplay();
    };
    const visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        isVisibleRef.current = entry.isIntersecting;
        if (entry.isIntersecting) startAutoplay();
        else stopAutoplay();
      },
      { threshold: 0.15 },
    );

    carousel.addEventListener("scroll", handleScroll, { passive: true });
    document.addEventListener("visibilitychange", handleDocumentVisibility);
    visibilityObserver.observe(carousel);

    return () => {
      stopAutoplay();
      if (settleRef.current) clearTimeout(settleRef.current);
      if (resumeRef.current) clearTimeout(resumeRef.current);
      carousel.removeEventListener("scroll", handleScroll);
      document.removeEventListener(
        "visibilitychange",
        handleDocumentVisibility,
      );
      visibilityObserver.disconnect();
    };
  }, [normalizeLoopPosition, startAutoplay, stopAutoplay]);

  const handleInteractionStart = () => {
    if (resumeRef.current) clearTimeout(resumeRef.current);
    stopAutoplay();
  };
  const scheduleAutoplayResume = () => {
    if (resumeRef.current) clearTimeout(resumeRef.current);
    resumeRef.current = setTimeout(startAutoplay, INTERACTION_RESUME_DELAY);
  };
  const handleInteractionEnd = () => {
    normalizeLoopPosition();
    scheduleAutoplayResume();
  };

  return (
    <div className="relative">
      <StaggerContainer
        ref={carouselRef}
        onPointerDown={handleInteractionStart}
        onPointerUp={handleInteractionEnd}
        onPointerCancel={handleInteractionEnd}
        onWheel={() => {
          handleInteractionStart();
          scheduleAutoplayResume();
        }}
        className="flex snap-x snap-mandatory gap-1.5 overflow-x-auto overscroll-x-contain scroll-smooth pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] sm:-mx-6 sm:gap-3 sm:px-6 sm:pb-2 lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item, index) => (
          <div
            key={`showcase-original-${index}`}
            data-showcase-item="original"
            className="w-[clamp(12.5rem,58vw,15rem)] shrink-0 snap-start md:w-[31%] lg:w-[calc((100%-2.25rem)/4)]"
          >
            {item}
          </div>
        ))}
        {loopItems.map((item, index) => (
          <div
            key={`showcase-clone-${index}`}
            data-showcase-item="clone"
            aria-hidden="true"
            inert
            className="w-[clamp(12.5rem,58vw,15rem)] shrink-0 snap-start md:w-[31%] lg:w-[calc((100%-2.25rem)/4)]"
          >
            {item}
          </div>
        ))}
      </StaggerContainer>
      {items.length > 1 ? (
        <div className="pointer-events-none absolute inset-x-0 top-1/2 z-raised hidden -translate-y-1/2 justify-between sm:flex">
          <button
            type="button"
            aria-label="Önceki ürün"
            onPointerDown={handleInteractionStart}
            onClick={() => {
              goBack();
              scheduleAutoplayResume();
            }}
            className="pointer-events-auto -ml-4 grid size-10 place-items-center rounded-full border border-zinc-200 bg-white/95 text-zinc-800 shadow-lg backdrop-blur-sm transition-colors hover:border-red-200 hover:text-primary"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Sonraki ürün"
            onPointerDown={handleInteractionStart}
            onClick={() => {
              advance();
              scheduleAutoplayResume();
            }}
            className="pointer-events-auto -mr-4 grid size-10 place-items-center rounded-full border border-zinc-200 bg-white/95 text-zinc-800 shadow-lg backdrop-blur-sm transition-colors hover:border-red-200 hover:text-primary"
          >
            <ArrowRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
