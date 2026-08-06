"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, m } from "motion/react";
import { ArrowUpRight, Laptop, Sparkles } from "lucide-react";

import { HeroVisual } from "@/components/home/hero-visual";
import { HeroParallax } from "@/components/home/hero-parallax";
import { Container } from "@/components/ui/container";

const HERO_SLIDES = [
  {
    kicker: "Premium teknoloji seçkisi",
    icon: Sparkles,
    title: "Teknolojinin",
    accent: "yeni standardı.",
    description:
      "Günlük hayatınıza değer katan seçkin teknolojiler. Güvenilir, yalın ve ayrıcalıklı bir alışveriş deneyimi.",
    cta: "Fırsatları keşfet",
    href: "/#deals",
    visual: "original" as const,
  },
  {
    kicker: "Yeni nesil çalışma deneyimi",
    icon: Laptop,
    title: "Gücünü her yere",
    accent: "yanında taşı.",
    description:
      "İş, eğitim ve yaratıcılık için seçilmiş laptop, tablet ve ses teknolojilerini keşfedin.",
    cta: "Laptopları keşfet",
    href: "/kategori/laptoplar",
    visual: "workspace" as const,
  },
] as const;

export function Hero() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const slide = HERO_SLIDES[activeSlide];
  const SlideIcon = slide.icon;

  const [initialTransitionComplete, setInitialTransitionComplete] =
    useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (paused || prefersReducedMotion) return;

    const timeout = window.setTimeout(
      () => {
        setActiveSlide((current) => (current + 1) % HERO_SLIDES.length);
        setInitialTransitionComplete(true);
      },
      initialTransitionComplete ? 5000 : 2000,
    );

    return () => window.clearTimeout(timeout);
  }, [activeSlide, initialTransitionComplete, paused, prefersReducedMotion]);

  return (
    <section
      aria-label="Öne çıkan içerikler"
      className="py-2.5 sm:py-4"
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setPaused(false);
      }}
    >
      <Container>
        <HeroParallax
          variant={slide.visual}
          copy={
            <AnimatePresence mode="sync" initial={false}>
              <m.div
                key={`copy-${activeSlide}`}
                initial={
                  prefersReducedMotion
                    ? false
                    : { opacity: 0, filter: "brightness(1.65) blur(5px)" }
                }
                animate={{ opacity: 1, filter: "brightness(1) blur(0px)" }}
                exit={{ opacity: 0, filter: "brightness(1.25) blur(2px)" }}
                transition={{ duration: 0.46, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="launch-hero-kicker">
                  <SlideIcon className="size-3.5" aria-hidden="true" />
                  {slide.kicker}
                </div>

                <h1 className="launch-hero-title">
                  {slide.title}
                  <span>{slide.accent}</span>
                </h1>

                <p className="launch-hero-description">{slide.description}</p>

                <Link
                  href={slide.href}
                  className="launch-hero-cta storefront-action"
                >
                  {slide.cta}
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </Link>
              </m.div>
            </AnimatePresence>
          }
          visual={
            <AnimatePresence mode="sync" initial={false}>
              <m.div
                key={`visual-${activeSlide}`}
                className="h-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
              >
                <HeroVisual variant={slide.visual} />
              </m.div>
            </AnimatePresence>
          }
          index={
            <div
              className="launch-hero-index"
              aria-label={`Slayt ${activeSlide + 1} / ${HERO_SLIDES.length}`}
            >
              <div className="launch-hero-dots" aria-label="Hero slaytları">
                {HERO_SLIDES.map((item, index) => (
                  <button
                    key={item.kicker}
                    type="button"
                    aria-label={`${index + 1}. slaytı göster`}
                    aria-current={index === activeSlide ? "true" : undefined}
                    onClick={() => setActiveSlide(index)}
                    className={index === activeSlide ? "is-active" : ""}
                  />
                ))}
              </div>
              {String(activeSlide + 1).padStart(2, "0")} /{" "}
              {String(HERO_SLIDES.length).padStart(2, "0")}
            </div>
          }
        />
      </Container>
    </section>
  );
}
