"use client";

import {
  Children,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";

import { StaggerContainer } from "@/components/motion/motion-system";

const AUTOPLAY_DELAY = 2000;
const SCROLL_SETTLE_DELAY = 180;

export function MobileShowcaseCarousel({ children }: { children: ReactNode }) {
  const items = Children.toArray(children);
  const carouselRef = useRef<HTMLDivElement>(null);
  const activeIndexRef = useRef(0);
  const autoplayRef = useRef<ReturnType<typeof setInterval> | null>(null);
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

  const startAutoplay = useCallback(() => {
    stopAutoplay();
    const mobile = window.matchMedia("(max-width: 767px)").matches;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (!isVisibleRef.current || !mobile || reducedMotion || items.length < 2)
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
    const handleViewportChange = () => {
      activeIndexRef.current = 0;
      carousel.scrollTo({ left: 0, behavior: "auto" });
      startAutoplay();
    };
    const mobileQuery = window.matchMedia("(max-width: 767px)");
    const visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        isVisibleRef.current = entry.isIntersecting;
        if (entry.isIntersecting) startAutoplay();
        else stopAutoplay();
      },
      { threshold: 0.15 },
    );

    carousel.addEventListener("scroll", handleScroll, { passive: true });
    mobileQuery.addEventListener("change", handleViewportChange);
    visibilityObserver.observe(carousel);

    return () => {
      stopAutoplay();
      if (settleRef.current) clearTimeout(settleRef.current);
      carousel.removeEventListener("scroll", handleScroll);
      mobileQuery.removeEventListener("change", handleViewportChange);
      visibilityObserver.disconnect();
    };
  }, [normalizeLoopPosition, startAutoplay, stopAutoplay]);

  const handleInteractionStart = () => stopAutoplay();
  const handleInteractionEnd = () => {
    normalizeLoopPosition();
    startAutoplay();
  };

  return (
    <StaggerContainer
      ref={carouselRef}
      onPointerDown={handleInteractionStart}
      onPointerUp={handleInteractionEnd}
      onPointerCancel={handleInteractionEnd}
      className="flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pb-2 [scrollbar-width:none] md:grid md:grid-cols-3 md:overflow-visible md:pb-0 xl:grid-cols-4 [&::-webkit-scrollbar]:hidden"
    >
      {items.map((item, index) => (
        <div
          key={`showcase-original-${index}`}
          data-showcase-item="original"
          className="w-[86%] max-w-[22rem] shrink-0 snap-start md:contents"
        >
          {item}
        </div>
      ))}
      {items.slice(0, items.length > 1 ? 1 : 0).map((item, index) => (
        <div
          key={`showcase-clone-${index}`}
          data-showcase-item="clone"
          aria-hidden="true"
          inert
          className="w-[86%] max-w-[22rem] shrink-0 snap-start md:hidden"
        >
          {item}
        </div>
      ))}
    </StaggerContainer>
  );
}
