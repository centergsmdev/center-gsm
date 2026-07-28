"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export function MobileSectionHeading({
  id,
  children,
  inverted = false,
}: {
  id: string;
  children: React.ReactNode;
  inverted?: boolean;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setIsVisible(true);
      return;
    }

    const heading = headingRef.current;
    if (!heading) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setIsVisible(true);
        observer.disconnect();
      },
      { threshold: 0.35 },
    );

    observer.observe(heading);
    return () => observer.disconnect();
  }, []);

  return (
    <h2
      ref={headingRef}
      id={id}
      className={cn(
        "mb-3 translate-y-2 text-center text-xs font-black uppercase tracking-[0.24em] opacity-0 transition-[opacity,transform] duration-500 ease-premium motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none sm:hidden",
        inverted ? "text-white" : "text-zinc-950",
        isVisible && "translate-y-0 opacity-100",
      )}
    >
      {children}
    </h2>
  );
}
