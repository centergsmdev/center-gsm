"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, m } from "motion/react";
import { ArrowUpRight, Laptop, Sparkles } from "lucide-react";

import { HeroVisual } from "@/components/home/hero-visual";
import { HeroParallax } from "@/components/home/hero-parallax";
import { Container } from "@/components/ui/container";

export function Hero() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const slides = [
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
  ];
  const slide = slides[activeSlide];
  const SlideIcon = slide.icon;

  useEffect(() => {
    if (paused) return;

    const interval = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % slides.length);
    }, 2000);

    return () => window.clearInterval(interval);
  }, [paused, slides.length]);

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
            <AnimatePresence mode="wait" initial={false}>
              <m.div
                key={`copy-${activeSlide}`}
                initial={{ opacity: 0, x: -18 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
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
            <AnimatePresence mode="wait" initial={false}>
              <m.div
                key={`visual-${activeSlide}`}
                className="h-full"
                initial={{ opacity: 0, scale: 1.025 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.985 }}
                transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
              >
                <HeroVisual variant={slide.visual} />
              </m.div>
            </AnimatePresence>
          }
          index={
            <div
              className="launch-hero-index"
              aria-label={`Slayt ${activeSlide + 1} / ${slides.length}`}
            >
              <div className="launch-hero-dots" aria-label="Hero slaytları">
                {slides.map((item, index) => (
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
              {String(slides.length).padStart(2, "0")}
            </div>
          }
        />
      </Container>
    </section>
  );
}
