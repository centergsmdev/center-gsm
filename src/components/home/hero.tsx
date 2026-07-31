import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";

import { HeroVisual } from "@/components/home/hero-visual";
import { HeroParallax } from "@/components/home/hero-parallax";
import { Container } from "@/components/ui/container";

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="py-2.5 sm:py-4">
      <Container>
        <HeroParallax
          copy={
            <>
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

              <Link
                href="/#deals"
                className="launch-hero-cta storefront-action"
              >
                Fırsatları keşfet
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </Link>
            </>
          }
          visual={<HeroVisual />}
          index={
            <div className="launch-hero-index" aria-label="Slayt 1 / 1">
              <span />
              01 / 01
            </div>
          }
        />
      </Container>
    </section>
  );
}
