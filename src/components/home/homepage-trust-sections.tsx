import Link from "next/link";
import {
  AnimatedCard,
  RevealSection,
  StaggerContainer,
} from "@/components/motion/motion-system";
import { Container } from "@/components/ui/container";

const categoryLinks = [
  { label: "Telefon", href: "/kategori/telefon" },
  { label: "Tablet", href: "/kategori/tablet" },
  { label: "Laptop", href: "/kategori/laptoplar" },
  { label: "Akıllı Saat", href: "/kategori/akilli-saat" },
] as const;

export function HomepageFooterCta() {
  return (
    <RevealSection
      aria-labelledby="homepage-footer-cta-title"
      className="pb-8 pt-2 sm:pb-16 sm:pt-4"
    >
      <Container>
        <div className="relative overflow-hidden rounded-[2rem] bg-zinc-950 px-5 py-10 text-center shadow-[0_28px_80px_rgba(9,9,11,0.2)] sm:px-10 sm:py-16">
          <span
            className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(220,38,38,0.3),transparent_44%),linear-gradient(120deg,transparent_22%,rgba(255,255,255,0.045)_50%,transparent_78%)]"
            aria-hidden="true"
          />
          <div className="relative mx-auto max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-red-400">
              CENTER GSM
            </p>
            <h2
              id="homepage-footer-cta-title"
              className="mt-3 text-balance text-3xl font-black tracking-[-0.045em] text-white sm:text-5xl"
            >
              Hayalindeki teknolojiyi şimdi keşfet.
            </h2>
            <StaggerContainer className="mt-8 grid grid-cols-2 gap-3 sm:mt-10 sm:grid-cols-4">
              {categoryLinks.map((category) => (
                <AnimatedCard key={category.href} className="h-full">
                  <Link
                    href={category.href}
                    className="flex min-h-14 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.07] px-4 py-3 text-sm font-bold text-white transition-[background-color,border-color,color] duration-200 hover:border-red-400/50 hover:bg-red-500/10 hover:text-red-300 sm:min-h-16 sm:text-base"
                  >
                    {category.label}
                  </Link>
                </AnimatedCard>
              ))}
            </StaggerContainer>
          </div>
        </div>
      </Container>
    </RevealSection>
  );
}
