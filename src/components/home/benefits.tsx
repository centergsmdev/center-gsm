import { BadgeCheck, HeadphonesIcon, ShieldCheck, Truck } from "lucide-react";

import { Container } from "@/components/ui/container";
import {
  AnimatedCard,
  RevealSection,
  StaggerContainer,
} from "@/components/motion/motion-system";

const benefits = [
  {
    title: "Aynı Gün Kargo",
    description: "14.00'e kadar verilen siparişlerde hızlı gönderim.",
    icon: Truck,
  },
  {
    title: "Güvenli Ödeme",
    description: "Korunan altyapıyla güvenli alışveriş deneyimi.",
    icon: ShieldCheck,
  },
  {
    title: "Orijinal Ürün",
    description: "Distribütör garantili, doğrulanmış teknoloji ürünleri.",
    icon: BadgeCheck,
  },
  {
    title: "Teknik Destek",
    description: "Satış öncesinde ve sonrasında uzman desteği.",
    icon: HeadphonesIcon,
  },
] as const;

export function Benefits() {
  return (
    <RevealSection aria-label="Alışveriş avantajları" className="pb-7 sm:pb-16">
      <Container>
        <StaggerContainer className="grid gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4 lg:gap-4">
          {benefits.map(({ title, description, icon: Icon }) => (
            <AnimatedCard key={title} className="h-full">
              <article className="home-premium-interactive home-premium-surface group h-full border border-zinc-200/80 bg-white p-4 sm:min-h-64 sm:p-7">
                <span className="grid size-12 place-items-center rounded-xl bg-zinc-950 text-white shadow-[0_10px_24px_rgba(9,9,11,0.16)] transition-[transform,background-color,box-shadow] duration-300 ease-premium group-hover:scale-105 group-hover:bg-primary group-hover:shadow-[0_16px_36px_rgba(220,38,38,0.28)] sm:size-16 sm:rounded-2xl sm:shadow-[0_14px_30px_rgba(9,9,11,0.18)]">
                  <Icon
                    className="size-6 sm:size-8"
                    strokeWidth={1.45}
                    aria-hidden="true"
                  />
                </span>
                <h3 className="mt-4 text-base font-black tracking-[-0.035em] text-zinc-950 sm:mt-8 sm:text-xl">
                  {title}
                </h3>
                <p className="mt-1.5 text-xs leading-5 text-zinc-500 sm:mt-3 sm:text-sm sm:leading-6">
                  {description}
                </p>
              </article>
            </AnimatedCard>
          ))}
        </StaggerContainer>
      </Container>
    </RevealSection>
  );
}
