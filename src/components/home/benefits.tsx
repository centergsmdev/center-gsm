import { BadgeCheck, HeadphonesIcon, ShieldCheck, Truck } from "lucide-react";

import { Container } from "@/components/ui/container";

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
    <section
      aria-label="Alışveriş avantajları"
      className="reveal-on-scroll pb-12 sm:pb-16"
    >
      <Container>
        <div className="stagger-grid grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
          {benefits.map(({ title, description, icon: Icon }) => (
            <article
              key={title}
              className="home-premium-interactive home-premium-surface group border border-zinc-200/80 bg-white p-6 sm:min-h-64 sm:p-7"
            >
              <span className="grid size-16 place-items-center rounded-2xl bg-zinc-950 text-white shadow-[0_14px_30px_rgba(9,9,11,0.18)] transition-[transform,background-color,box-shadow] duration-300 ease-premium group-hover:scale-105 group-hover:bg-primary group-hover:shadow-[0_16px_36px_rgba(220,38,38,0.28)]">
                <Icon className="size-8" strokeWidth={1.45} aria-hidden="true" />
              </span>
              <h3 className="mt-8 text-lg font-black tracking-[-0.035em] text-zinc-950 sm:text-xl">
                {title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-zinc-500">
                {description}
              </p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
