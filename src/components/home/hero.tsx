import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";

import { HeroVisual } from "@/components/home/hero-visual";
import {
  AnimatedImage,
  FadeIn,
  FadeUp,
} from "@/components/motion/motion-system";
import { Container } from "@/components/ui/container";

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="py-2.5 sm:py-4">
      <Container>
        <FadeIn className="launch-hero">
          <div className="launch-hero-atmosphere" aria-hidden="true" />

          <div className="launch-hero-layout">
            <FadeUp className="launch-hero-copy">
              <div className="launch-hero-kicker">
                <Sparkles className="size-3.5" aria-hidden="true" />
                Premium teknoloji seçkisi
              </div>

              <h1 id="hero-title" className="launch-hero-title">
                Teknolojinin
                <span>yeni standardı.</span>
              </h1>

              <p className="launch-hero-description">
                Günlük hayatınıza değer katan seçkin teknolojiler. Güvenilir,
                yalın ve ayrıcalıklı bir alışveriş deneyimi.
              </p>

              <Link href="/#deals" className="launch-hero-cta">
                Fırsatları keşfet
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </Link>
            </FadeUp>

            <AnimatedImage>
              <HeroVisual />
            </AnimatedImage>
          </div>

          <div className="launch-hero-index" aria-label="Slayt 1 / 1">
            <span />
            01 / 01
          </div>
        </FadeIn>
      </Container>
    </section>
  );
}
