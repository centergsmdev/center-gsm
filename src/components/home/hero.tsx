import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { HeroVisual } from "@/components/home/hero-visual";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { cn } from "@/lib/utils";

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="py-3 sm:py-5">
      <Container>
        <div className="home-premium-surface premium-hero relative isolate overflow-hidden border border-white/10 text-white">
          <div className="relative z-raised grid min-h-[560px] lg:min-h-[520px] lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
            <div className="hero-copy-enter flex flex-col justify-center px-6 pb-3 pt-10 sm:px-10 sm:pt-14 lg:px-14 lg:py-16">
              <Badge
                variant="dark"
                className="mb-6 w-fit border border-white/15 bg-white/10 px-3 py-2 text-white backdrop-blur-md"
              >
                <Sparkles
                  className="mr-2 size-3.5 text-red-400"
                  aria-hidden="true"
                />
                Premium teknoloji seçkisi
              </Badge>
              <h1
                id="hero-title"
                className="max-w-xl text-balance text-4xl font-black leading-[0.98] tracking-[-0.06em] sm:text-5xl lg:text-6xl xl:text-7xl"
              >
                Teknolojiyle
                <br />
                bir adım önde.
              </h1>
              <p className="mt-5 max-w-md text-sm leading-6 text-zinc-300 sm:text-base sm:leading-7">
                Günlük hayatınıza değer katan teknolojileri, güvenilir ve
                seçkin bir alışveriş deneyimiyle keşfedin.
              </p>
              <div className="mt-7">
                <Link
                  href="/#deals"
                  className={cn(
                    buttonVariants({ variant: "primary", size: "lg" }),
                    "hero-cta group shadow-[0_12px_34px_rgba(220,38,38,0.32)]",
                  )}
                >
                  Fırsatları Keşfet
                  <ArrowRight
                    className="hero-cta-arrow size-4"
                    aria-hidden="true"
                  />
                </Link>
              </div>
              <div
                className="mt-8 flex items-center gap-3 text-[10px] font-semibold text-zinc-500"
                aria-label="Slayt 1 / 1"
              >
                <span className="h-1.5 w-9 rounded-full bg-primary" />
                <span>01 / 01</span>
              </div>
            </div>

            <HeroVisual />
          </div>
        </div>
      </Container>
    </section>
  );
}
