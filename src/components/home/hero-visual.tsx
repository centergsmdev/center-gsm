"use client";

import Image from "next/image";
import { useRef, type PointerEvent } from "react";

const PARALLAX_DISTANCE = 5;

export function HeroVisual() {
  const productRef = useRef<HTMLDivElement>(null);

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch") return;

    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;

    productRef.current?.style.setProperty(
      "--launch-x",
      `${x * PARALLAX_DISTANCE}px`,
    );
    productRef.current?.style.setProperty(
      "--launch-y",
      `${y * PARALLAX_DISTANCE}px`,
    );
  }

  function resetParallax() {
    productRef.current?.style.setProperty("--launch-x", "0px");
    productRef.current?.style.setProperty("--launch-y", "0px");
  }

  return (
    <div
      className="launch-hero-visual"
      onPointerMove={handlePointerMove}
      onPointerLeave={resetParallax}
    >
      <div className="launch-light launch-light-blue" aria-hidden="true">
        <span />
      </div>
      <div className="launch-light launch-light-red" aria-hidden="true">
        <span />
      </div>

      <div ref={productRef} className="launch-product-stage">
        <Image
          src="/images/home/premium-tech-hero-transparent.webp"
          alt="PlayStation 5, iPhone 17 Pro Max ve Apple Watch Ultra"
          fill
          priority
          sizes="(max-width: 767px) 100vw, (max-width: 1279px) 62vw, 760px"
          className="object-contain object-center lg:object-right"
        />
      </div>
    </div>
  );
}
