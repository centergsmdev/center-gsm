import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { ProductCard } from "@/components/catalog/product-card";
import { AnimatedCard, RevealSection } from "@/components/motion/motion-system";
import { Container } from "@/components/ui/container";
import { SectionTitle } from "@/components/ui/section-title";
import type { CatalogProduct } from "@/types/product";
import { MobileShowcaseCarousel } from "./mobile-showcase-carousel";

export function WeeklyDeals({ products }: { products: CatalogProduct[] }) {
  const discountedProducts = products
    .filter(
      (product) =>
        product.previousPrice !== undefined &&
        product.previousPrice > product.price &&
        product.discountRate !== undefined,
    )
    .slice(0, 8);

  return (
    <RevealSection
      aria-labelledby="weekly-deals-title"
      className="border-y border-zinc-200/80 bg-zinc-50/70 py-8 sm:py-14"
    >
      <Container>
        <SectionTitle
          id="weekly-deals-title"
          title="Haftanın Fırsatları"
          description="Sınırlı süreli avantajlı fiyatlar"
          action={{
            label: "Tüm Kampanyalar",
            href: "/urunler?indirim=var",
          }}
        />
        <Link
          href="/urunler?indirim=var"
          className="mb-5 ml-auto flex w-fit items-center gap-2 text-sm font-semibold text-zinc-600 transition-colors hover:text-primary sm:hidden"
        >
          Tüm Kampanyalar
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
        {discountedProducts.length ? (
          <MobileShowcaseCarousel>
            {discountedProducts.map((product) => (
              <AnimatedCard
                key={product.id}
                className="h-full max-md:!transform-none max-md:!opacity-100"
              >
                <ProductCard product={product} />
              </AnimatedCard>
            ))}
          </MobileShowcaseCarousel>
        ) : (
          <p className="home-premium-surface rounded-2xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">
            Bu hafta aktif fırsat ürünü bulunmuyor.
          </p>
        )}
      </Container>
    </RevealSection>
  );
}
