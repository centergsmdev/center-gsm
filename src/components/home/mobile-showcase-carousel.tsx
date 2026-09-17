"use client";

import { Children, useRef, type ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { StaggerContainer } from "@/components/motion/motion-system";

export function HomepageProductCarousel({ children }: { children: ReactNode }) {
  const items = Children.toArray(children);
  const carouselRef = useRef<HTMLDivElement>(null);
  const scroll = (direction: -1 | 1) => {
    const carousel = carouselRef.current;
    if (!carousel) return;
    carousel.scrollBy({
      left: direction * carousel.clientWidth * 0.82,
      behavior: "smooth",
    });
  };

  return (
    <div className="relative">
      <StaggerContainer
        ref={carouselRef}
        className="homepage-product-carousel flex snap-x snap-mandatory gap-1.5 overflow-x-auto overscroll-x-contain scroll-smooth pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] sm:-mx-6 sm:gap-3 sm:px-6 sm:pb-2 lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item, index) => (
          <div
            key={`showcase-original-${index}`}
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
            onClick={() => scroll(-1)}
            className="pointer-events-auto -ml-4 grid size-10 place-items-center rounded-full border border-zinc-200 bg-white/95 text-zinc-800 shadow-lg backdrop-blur-sm transition-colors hover:border-red-200 hover:text-primary"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Sonraki ürün"
            onClick={() => scroll(1)}
            className="pointer-events-auto -mr-4 grid size-10 place-items-center rounded-full border border-zinc-200 bg-white/95 text-zinc-800 shadow-lg backdrop-blur-sm transition-colors hover:border-red-200 hover:text-primary"
          >
            <ArrowRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
