"use client";

import Image from "next/image";
import { useRef, type PointerEvent } from "react";

const PARALLAX_DISTANCE = 5;

export function HeroVisual({
  variant = "original",
}: {
  variant?: "original" | "workspace";
}) {
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
      className={`launch-hero-visual ${variant === "workspace" ? "launch-hero-visual-workspace" : ""}`}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetParallax}
    >
      {variant === "original" ? (
        <>
          <div className="launch-light launch-light-blue" aria-hidden="true">
            <span />
          </div>
          <div className="launch-light launch-light-red" aria-hidden="true">
            <span />
          </div>
        </>
      ) : null}

      <div
        ref={productRef}
        className={`launch-product-stage ${variant === "workspace" ? "launch-product-stage-workspace" : ""}`}
      >
        <Image
          src={
            variant === "workspace"
              ? "/images/home/premium-workspace-hero-v2.webp"
              : "/images/home/premium-tech-hero-transparent.webp"
          }
          alt={
            variant === "workspace"
              ? "Dizüstü bilgisayar, tablet ve kablosuz kulaklık"
              : "PlayStation 5, iPhone 17 Pro Max ve Apple Watch Ultra"
          }
          fill
          priority
          sizes="(max-width: 767px) 100vw, (max-width: 1279px) 62vw, 760px"
          className={`launch-product-image object-center ${
            variant === "workspace"
              ? "object-cover"
              : "object-contain lg:object-right"
          }`}
        />
      </div>
    </div>
  );
}
