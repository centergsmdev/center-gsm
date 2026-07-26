import {
  Gamepad2,
  Headphones,
  Laptop,
  MonitorSmartphone,
  Smartphone,
  Watch,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { SectionTitle } from "@/components/ui/section-title";

const categories = [
  { name: "Telefon", subtitle: "En yeni modeller", icon: Smartphone },
  { name: "Bilgisayar", subtitle: "Performans ve mobilite", icon: Laptop },
  { name: "Tablet", subtitle: "Her an üretken", icon: MonitorSmartphone },
  { name: "Akıllı Saat", subtitle: "Günün sizinle", icon: Watch },
  { name: "Kulaklık", subtitle: "Sesi yeniden keşfedin", icon: Headphones },
  { name: "Oyuncu", subtitle: "Oyunun merkezinde", icon: Gamepad2 },
];

export function Categories() {
  return (
    <section
      id="categories"
      aria-labelledby="categories-title"
      className="reveal-on-scroll py-10 sm:py-14"
    >
      <Container>
        <SectionTitle
          id="categories-title"
          eyebrow="Kategoriler"
          title="Teknoloji dünyasını keşfedin"
          action={{ label: "Tüm kategoriler", href: "/" }}
        />
        <div className="stagger-grid grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {categories.map(({ name, subtitle, icon: Icon }) => (
            <Card
              key={name}
              className="group relative overflow-hidden border-white/80 bg-white/85 shadow-sm backdrop-blur hover:-translate-y-1 hover:border-red-200 hover:shadow-md active:scale-[0.99]"
            >
              <button
                type="button"
                className="flex min-h-32 w-full flex-col items-start p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary sm:min-h-36"
              >
                <span className="grid size-11 place-items-center rounded-md bg-surface-subtle text-zinc-800 transition-colors duration-200 group-hover:bg-zinc-950 group-hover:text-white">
                  <Icon
                    className="size-5"
                    strokeWidth={1.6}
                    aria-hidden="true"
                  />
                </span>
                <span className="mt-auto block text-sm font-bold">{name}</span>
                <span className="mt-1 block text-xs leading-5 text-muted">
                  {subtitle}
                </span>
              </button>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}
