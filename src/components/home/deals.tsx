import { ProductCard } from "@/components/catalog/product-card";
import { Container } from "@/components/ui/container";
import { SectionTitle } from "@/components/ui/section-title";
import type { CatalogProduct } from "@/types/product";
import { MobileSectionHeading } from "./mobile-section-heading";
import {
  AnimatedCard,
  RevealSection,
  StaggerContainer,
} from "@/components/motion/motion-system";

export function Deals({ products }: { products: CatalogProduct[] }) {
  const discountedProducts = products
    .filter(
      (product) =>
        product.previousPrice !== undefined &&
        product.previousPrice > product.price &&
        product.discountRate !== undefined,
    )
    .slice(0, 4);

  return (
    <RevealSection
      id="deals"
      aria-label="Kampanyalar"
      className="tech-panel-dark scroll-mt-36 py-5 sm:scroll-mt-44 sm:py-11"
    >
      <Container>
        <MobileSectionHeading id="deals-title" inverted>
          Kampanyalar
        </MobileSectionHeading>
        <div className="hidden sm:block">
          <SectionTitle
            id="deals-title-desktop"
            inverted
            eyebrow="Seçili fırsatlar"
            title="Kaçırılmayacak teknoloji fırsatları"
            description="Sınırlı süreli fiyatlarla öne çıkan premium teknoloji ürünlerini keşfedin."
            action={{ label: "Tüm fırsatlar", href: "/urunler?sirala=popular" }}
          />
        </div>
        {discountedProducts.length ? (
          <StaggerContainer
            className="flex snap-x snap-mandatory gap-1.5 overflow-x-auto scroll-smooth pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] sm:-mx-6 sm:gap-3 sm:px-6 sm:pb-2 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0 lg:pb-0 [&::-webkit-scrollbar]:hidden"
            aria-label="Kampanyalı ürünler"
          >
            {discountedProducts.map((product) => (
              <AnimatedCard
                key={product.id}
                className="w-[clamp(12.5rem,58vw,15rem)] shrink-0 snap-start md:w-[31%] lg:w-auto"
              >
                <ProductCard product={product} compactMobile denseMobile />
              </AnimatedCard>
            ))}
          </StaggerContainer>
        ) : (
          <p className="home-premium-surface border border-white/10 bg-white/5 p-8 text-center text-sm text-zinc-400">
            Aktif kampanyalı ürün bulunmuyor.
          </p>
        )}
      </Container>
    </RevealSection>
  );
}
