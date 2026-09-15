import Link from "next/link";
import {
  BadgeCheck,
  HeadphonesIcon,
  MapPin,
  PackageCheck,
  ShieldCheck,
  Truck,
  type LucideIcon,
} from "lucide-react";

import {
  AnimatedCard,
  RevealSection,
  StaggerContainer,
} from "@/components/motion/motion-system";
import { Container } from "@/components/ui/container";
import { SectionTitle } from "@/components/ui/section-title";

const confidenceItems: Array<{
  title: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    title: "%100 Orijinal Ürün",
    description: "Güvenilir tedarik kanallarından seçilmiş teknoloji ürünleri.",
    icon: BadgeCheck,
  },
  {
    title: "Yetkili Garantili Ürünler",
    description:
      "Garanti kapsamı açıkça belirtilen güvenli alışveriş deneyimi.",
    icon: PackageCheck,
  },
  {
    title: "Güvenli Ödeme",
    description: "Ödeme bilgileriniz korunan altyapı üzerinden işlenir.",
    icon: ShieldCheck,
  },
  {
    title: "Aynı Gün Kargo",
    description: "Uygun siparişleriniz hızla hazırlanıp kargoya teslim edilir.",
    icon: Truck,
  },
  {
    title: "Türkiye Geneli Teslimat",
    description:
      "Siparişleriniz anlaşmalı taşıyıcılarla adresinize ulaştırılır.",
    icon: MapPin,
  },
  {
    title: "Satış Sonrası Destek",
    description: "Satın alma sonrasında da ihtiyaç duyduğunuzda yanınızdayız.",
    icon: HeadphonesIcon,
  },
];

export function WhyCenterGsm() {
  return (
    <RevealSection
      aria-labelledby="why-center-gsm-title"
      className="py-8 sm:py-16"
    >
      <Container>
        <SectionTitle
          id="why-center-gsm-title"
          eyebrow="Güven"
          title="Neden CENTER GSM?"
          description="Teknoloji alışverişinizi güvenle tamamlayın."
        />
        <StaggerContainer className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {confidenceItems.map(({ title, description, icon: Icon }) => (
            <AnimatedCard key={title} className="h-full">
              <article className="home-premium-interactive home-premium-surface group flex h-full items-start gap-3 border border-zinc-200/80 bg-white p-3 sm:min-h-44 sm:gap-4 sm:p-6">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-zinc-950 text-white shadow-[0_12px_28px_rgba(9,9,11,0.18)] transition-[transform,background-color,box-shadow] duration-300 ease-premium group-hover:scale-105 group-hover:bg-primary group-hover:shadow-[0_16px_34px_rgba(220,38,38,0.26)] sm:size-12 sm:rounded-2xl">
                  <Icon
                    className="size-5 sm:size-6"
                    strokeWidth={1.6}
                    aria-hidden="true"
                  />
                </span>
                <div>
                  <h3 className="text-sm font-black tracking-[-0.025em] text-zinc-950 sm:text-lg">
                    {title}
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-zinc-500 sm:mt-2 sm:text-sm sm:leading-6">
                    {description}
                  </p>
                </div>
              </article>
            </AnimatedCard>
          ))}
        </StaggerContainer>
      </Container>
    </RevealSection>
  );
}

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
