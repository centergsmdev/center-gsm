import Image from "next/image";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { normalizeTaxonomySlug } from "@/lib/catalog/taxonomy-slug";
import { SectionTitle } from "@/components/ui/section-title";
import { getCategories } from "@/lib/catalog/data";
import {
  AnimatedCard,
  RevealSection,
  StaggerContainer,
} from "@/components/motion/motion-system";

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
    <RevealSection
      id="categories"
      aria-label="Kategoriler"
      className="pb-6 pt-2 sm:py-14"
    >
      <Container>
        <div className="hidden sm:block">
          <SectionTitle
            id="categories-title"
            eyebrow="Kategoriler"
            title="Teknoloji dünyasını keşfedin"
            action={{ label: "Tüm kategoriler", href: "/urunler" }}
          />
        </div>
        <StaggerContainer className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 lg:gap-4">
          {categoryCards.map((card) => {
            const category = categoriesByName.get(normalizeName(card.name));
            if (!category) return null;

            return (
              <AnimatedCard key={category.id} className="h-full">
                <Card className="category-premium-card home-premium-surface group h-full overflow-hidden border-zinc-200/80 bg-white">
                  <Link
                    href={`/kategori/${normalizeTaxonomySlug(category.slug)}`}
                    className="flex h-full min-h-44 flex-col p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary sm:min-h-72 sm:p-4"
                  >
                    <span className="category-premium-media relative block min-h-24 flex-1 overflow-hidden bg-white sm:min-h-44">
                      <Image
                        src={card.image}
                        alt={`${card.name} kategorisi`}
                        fill
                        sizes="(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 16vw"
                        className="object-contain p-1 transition-transform duration-500 ease-premium group-hover:scale-[1.05] sm:p-2"
                      />
                    </span>
                    <span className="mx-1 border-t border-zinc-100 pb-0.5 pt-2.5 sm:pb-1 sm:pt-4">
                      <span className="block text-sm font-black tracking-[-0.025em] text-zinc-950 sm:text-base">
                        {card.name}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-zinc-500 sm:text-sm">
                        {card.subtitle}
                      </span>
                    </span>
                  </Link>
                </Card>
              </AnimatedCard>
            );
          })}
        </StaggerContainer>
      </Container>
    </RevealSection>
  );
}
