"use client";

import { useRef, type ReactNode } from "react";
import { m, useReducedMotion, useScroll, useTransform } from "motion/react";

export function HeroParallax({
  copy,
  visual,
  index,
}: {
  copy: ReactNode;
  visual: ReactNode;
  index: ReactNode;
}) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: sceneRef,
    offset: ["start start", "end start"],
  });
  const backgroundY = useTransform(scrollYProgress, [0, 1], [0, 14]);
  const copyY = useTransform(scrollYProgress, [0, 1], [0, -10]);
  const visualY = useTransform(scrollYProgress, [0, 1], [0, 10]);
  const visualScale = useTransform(scrollYProgress, [0, 1], [1, 1.012]);

  return (
    <m.div
      ref={sceneRef}
      className="launch-hero"
      initial={reducedMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      <m.div
        className="launch-hero-atmosphere"
        style={{ y: reducedMotion ? 0 : backgroundY }}
        aria-hidden="true"
      />
      <div className="launch-hero-layout">
        <m.div
          className="launch-hero-copy"
          style={{ y: reducedMotion ? 0 : copyY }}
        >
          {copy}
        </m.div>
        <m.div
          className="will-change-transform"
          style={{
            y: reducedMotion ? 0 : visualY,
            scale: reducedMotion ? 1 : visualScale,
          }}
        >
          {visual}
        </m.div>
      </div>
      {index}
    </m.div>
  );
}
