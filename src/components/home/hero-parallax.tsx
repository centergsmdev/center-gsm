"use client";

import { useRef, type ReactNode } from "react";
import {
  AnimatePresence,
  m,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";

const HERO_BACKGROUNDS = {
  original: {
    desktop: "/images/home/hero-premium-selection-desktop.webp",
    mobile: "/images/home/hero-premium-selection-mobile.webp?v=4",
  },
  workspace: {
    desktop: "/images/home/hero-workspace-desktop.webp",
    mobile: "/images/home/hero-workspace-mobile.webp?v=4",
  },
} as const;

export function HeroParallax({
  copy,
  visual,
  index,
  variant = "original",
}: {
  copy: ReactNode;
  visual: ReactNode;
  index: ReactNode;
  variant?: "original" | "workspace";
}) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: sceneRef,
    offset: ["start start", "end start"],
  });
  const backgroundY = useTransform(scrollYProgress, [0, 1], [0, 14]);
  const visualY = useTransform(scrollYProgress, [0, 1], [0, 10]);
  const background = HERO_BACKGROUNDS[variant];

  return (
    <m.div
      ref={sceneRef}
      className={`launch-hero ${variant === "workspace" ? "launch-hero-workspace" : ""}`}
      initial={false}
    >
      <AnimatePresence initial={false}>
        <m.div
          key={variant}
          className="launch-hero-background"
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          aria-hidden="true"
        >
          <div
            className="launch-hero-background-image launch-hero-background-desktop"
            style={{ backgroundImage: `url("${background.desktop}")` }}
          />
          <div
            className="launch-hero-background-image launch-hero-background-mobile"
            style={{ backgroundImage: `url("${background.mobile}")` }}
          />
        </m.div>
      </AnimatePresence>
      <m.div
        className="launch-hero-atmosphere"
        style={{ y: reducedMotion ? 0 : backgroundY }}
        aria-hidden="true"
      />
      <div className="launch-hero-layout">
        <div className="launch-hero-copy">{copy}</div>
        <m.div
          className="h-full will-change-transform"
          style={{
            y: reducedMotion ? 0 : visualY,
          }}
        >
          {visual}
        </m.div>
      </div>
      {index}
    </m.div>
  );
}
