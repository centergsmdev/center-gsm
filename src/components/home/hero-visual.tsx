"use client";

import Image from "next/image";
import { useRef, type PointerEvent } from "react";

const PARALLAX_DISTANCE = 6;

export function HeroVisual() {
  const visualRef = useRef<HTMLDivElement>(null);

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch") return;

    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;

    visualRef.current?.style.setProperty(
      "--hero-parallax-x",
      `${x * PARALLAX_DISTANCE}px`,
    );
    visualRef.current?.style.setProperty(
      "--hero-parallax-y",
      `${y * PARALLAX_DISTANCE}px`,
    );
  }

  function resetParallax() {
    visualRef.current?.style.setProperty("--hero-parallax-x", "0px");
    visualRef.current?.style.setProperty("--hero-parallax-y", "0px");
  }

  return (
    <div
      className="hero-visual-enter relative min-h-64 sm:min-h-80 lg:min-h-[480px]"
      onPointerMove={handlePointerMove}
      onPointerLeave={resetParallax}
    >
      <div ref={visualRef} className="hero-product-parallax absolute inset-0">
        <div className="hero-product-float relative size-full">
          <Image
            src="/images/home/premium-tech-hero.png"
            alt="PlayStation 5, iPhone 17 Pro Max ve Apple Watch Ultra"
            fill
            priority={true}
            sizes="(max-width: 767px) 100vw, (max-width: 1279px) 58vw, 720px"
            className="hero-product-image object-contain object-center lg:object-right"
          />
        </div>
      </div>
    </div>
  );
}
