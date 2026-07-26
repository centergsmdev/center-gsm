import { BadgeCheck, HeadphonesIcon, ShieldCheck, Truck } from "lucide-react";

import { Container } from "@/components/ui/container";
import { Divider } from "@/components/ui/divider";

const benefits = [
  {
    title: "Aynı Gün Kargo",
    description: "14.00'e kadar verilen siparişlerde",
    icon: Truck,
  },
  {
    title: "Güvenli Ödeme",
    description: "Korunan ödeme altyapısı",
    icon: ShieldCheck,
  },
  {
    title: "Orijinal Ürün",
    description: "Distribütör garantili ürünler",
    icon: BadgeCheck,
  },
  {
    title: "Teknik Destek",
    description: "Satış öncesi ve sonrası destek",
    icon: HeadphonesIcon,
  },
];

export function Benefits() {
  return (
    <section aria-label="Alışveriş avantajları" className="reveal-on-scroll pb-10 sm:pb-14">
      <Container>
        <div className="grid overflow-hidden rounded-lg border border-white/80 bg-white/80 shadow-sm backdrop-blur sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map(({ title, description, icon: Icon }, index) => (
            <div
              key={title}
              className="relative flex items-center gap-3 p-4 sm:p-5"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-md bg-zinc-950 text-white shadow-sm">
                <Icon className="size-5" strokeWidth={1.7} aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-sm font-bold">{title}</h3>
                <p className="mt-1 text-xs leading-5 text-muted">
                  {description}
                </p>
              </div>
              {index < benefits.length - 1 ? (
                <Divider
                  orientation="vertical"
                  className="absolute right-0 hidden h-10 lg:block"
                />
              ) : null}
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
