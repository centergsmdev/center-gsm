import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { cn } from "@/lib/utils";

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="reveal-on-scroll py-3 sm:py-5">
      <Container>
        <div className="tech-panel-dark relative min-h-[340px] overflow-hidden rounded-xl border border-white/10 px-5 py-8 text-white shadow-[0_28px_80px_rgba(15,23,42,0.25)] sm:min-h-[380px] sm:px-9 lg:px-14">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(circle_at_82%_22%,rgba(239,20,20,0.34),transparent_30%),radial-gradient(circle_at_72%_86%,rgba(255,255,255,0.1),transparent_25%)]"
          />
          <div
            aria-hidden="true"
            className="absolute -right-14 top-1/2 h-72 w-44 -translate-y-1/2 rotate-12 rounded-[2.5rem] border border-white/20 bg-gradient-to-br from-zinc-700/80 to-black shadow-2xl sm:right-24 sm:h-80 sm:w-48 lg:right-52"
          />
          <div
            aria-hidden="true"
            className="absolute -right-24 top-1/2 h-44 w-80 -translate-y-1/2 rotate-[-8deg] rounded-xl border border-white/15 bg-gradient-to-br from-zinc-800 to-black shadow-2xl sm:right-[-3rem] lg:right-12"
          />
          <div
            aria-hidden="true"
            className="absolute right-14 top-12 size-44 rounded-full border-[28px] border-zinc-800/90 shadow-2xl sm:right-64 lg:right-[26rem]"
          />

          <div className="relative z-raised flex min-h-[280px] max-w-xl flex-col justify-center sm:min-h-[315px]">
            <Badge
              variant="dark"
              className="mb-5 w-fit border border-white/10 bg-white/10 px-3 py-2 text-white backdrop-blur"
            >
              <Sparkles
                className="mr-2 size-3.5 text-red-400"
                aria-hidden="true"
              />
              Premium teknoloji seçkisi
            </Badge>
            <h1
              id="hero-title"
              className="text-balance text-3xl font-black leading-[1.02] tracking-[-0.055em] min-[375px]:text-4xl sm:text-5xl lg:text-6xl"
            >
              Teknolojiyle
              <br />
              bir adım önde.
            </h1>
            <p className="mt-4 max-w-md text-sm leading-6 text-zinc-300 sm:text-base">
              Günlük hayatınıza değer katan teknolojileri, güvenilir alışveriş
              deneyimiyle keşfedin.
            </p>
            <div className="mt-6">
              <Link
                href="/#deals"
                className={cn(
                  buttonVariants({ variant: "primary", size: "lg" }),
                  "relative z-raised shadow-[0_10px_30px_rgba(220,38,38,0.3)] hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(220,38,38,0.38)]",
                )}
              >
                Fırsatları Keşfet
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <div
            className="absolute bottom-5 left-6 z-raised flex items-center gap-2 sm:left-10 lg:left-16"
            aria-label="Slayt 1 / 1"
          >
            <span className="h-1.5 w-9 rounded-full bg-primary" />
            <span className="text-[10px] font-semibold text-zinc-500">
              01 / 01
            </span>
          </div>
        </div>
      </Container>
    </section>
  );
}
