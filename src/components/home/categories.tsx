import Image from "next/image";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { SectionTitle } from "@/components/ui/section-title";
import { getCategories } from "@/lib/catalog/data";

const categoryCards = [
  {
    name: "Telefon",
    subtitle: "En yeni modeller",
    image: "/images/home/categories/phone.webp",
  },
  {
    name: "Bilgisayar",
    subtitle: "Performans ve mobilite",
    image: "/images/home/categories/computer.webp",
  },
  {
    name: "Tablet",
    subtitle: "Her an üretken",
    image: "/images/home/categories/tablet.webp",
  },
  {
    name: "Akıllı Saat",
    subtitle: "Günün sizinle",
    image: "/images/home/categories/smartwatch.webp",
  },
  {
    name: "Kulaklık",
    subtitle: "Sesi yeniden keşfedin",
    image: "/images/home/categories/headphones.webp",
  },
  {
    name: "Aksesuar",
    subtitle: "Tamamlayıcı ürünler",
    image: "/images/home/categories/accessories.webp",
  },
] as const;

function normalizeName(value: string) {
  return value.trim().toLocaleLowerCase("tr-TR");
}

export async function Categories() {
  const categoryResult = await getCategories();
  const categoriesByName = new Map(
    categoryResult.data.map((category) => [
      normalizeName(category.name),
      category,
    ]),
  );

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
          action={{ label: "Tüm kategoriler", href: "/urunler" }}
        />
        <div className="stagger-grid grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 lg:gap-4">
          {categoryCards.map((card) => {
            const category = categoriesByName.get(normalizeName(card.name));
            if (!category) return null;

            return (
              <Card
                key={category.id}
                className="home-premium-surface group overflow-hidden border-zinc-200/80 bg-white"
              >
                <Link
                  href={`/kategori/${category.slug}`}
                  className="flex h-full min-h-64 flex-col p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary sm:min-h-72 sm:p-4"
                >
                  <span className="relative block min-h-40 flex-1 overflow-hidden rounded-[calc(var(--home-premium-radius)-0.5rem)] bg-zinc-50 sm:min-h-44">
                    <Image
                      src={card.image}
                      alt={`${card.name} kategorisi`}
                      fill
                      sizes="(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 16vw"
                      className="object-contain transition-transform duration-500 ease-premium group-hover:scale-[1.06]"
                    />
                  </span>
                  <span className="px-1 pb-1 pt-4">
                    <span className="block text-sm font-black tracking-[-0.025em] text-zinc-950 sm:text-base">
                      {card.name}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-zinc-500 sm:text-sm">
                      {card.subtitle}
                    </span>
                  </span>
                </Link>
              </Card>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
