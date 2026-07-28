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
      className="hero-visual-enter relative min-h-[270px] overflow-hidden sm:min-h-[340px] lg:min-h-[480px] lg:overflow-visible"
      onPointerMove={handlePointerMove}
      onPointerLeave={resetParallax}
    >
      <div className="hero-neon-columns" aria-hidden="true">
        <span className="hero-neon-cluster hero-neon-cluster-blue">
          <span className="hero-neon-column" />
          <span className="hero-neon-particle hero-neon-particle-1" />
          <span className="hero-neon-particle hero-neon-particle-2" />
          <span className="hero-neon-particle hero-neon-particle-3" />
          <span className="hero-neon-particle hero-neon-particle-4" />
        </span>
        <span className="hero-neon-cluster hero-neon-cluster-red">
          <span className="hero-neon-column" />
          <span className="hero-neon-particle hero-neon-particle-1" />
          <span className="hero-neon-particle hero-neon-particle-2" />
          <span className="hero-neon-particle hero-neon-particle-3" />
          <span className="hero-neon-particle hero-neon-particle-4" />
        </span>
      </div>
      <div className="hero-product-stage absolute inset-y-0 right-0">
        <div ref={visualRef} className="hero-product-parallax absolute inset-0">
          <div className="hero-product-float relative size-full">
            <Image
              src="/images/home/premium-tech-hero-transparent.webp"
              alt="PlayStation 5, iPhone 17 Pro Max ve Apple Watch Ultra"
              fill
              priority={true}
              sizes="(max-width: 767px) 100vw, (max-width: 1279px) 58vw, 720px"
              className="hero-product-image object-contain object-center lg:object-right"
            />
            <Image
              src="/images/home/premium-tech-hero-transparent.webp"
              alt=""
              fill
              aria-hidden="true"
              sizes="(max-width: 767px) 100vw, (max-width: 1279px) 58vw, 720px"
              className="hero-watch-emphasis pointer-events-none object-contain object-center lg:object-right"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
