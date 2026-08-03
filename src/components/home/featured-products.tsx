import { ProductCard } from "@/components/catalog/product-card";
import { AnimatedCard, RevealSection } from "@/components/motion/motion-system";
import { Container } from "@/components/ui/container";
import { SectionTitle } from "@/components/ui/section-title";
import type { CatalogProduct } from "@/types/product";
import { MobileShowcaseCarousel } from "./mobile-showcase-carousel";

export function FeaturedProducts({ products }: { products: CatalogProduct[] }) {
  return (
    <RevealSection
      aria-labelledby="featured-products-title"
      className="py-8 sm:py-14"
    >
      <Container>
        <SectionTitle
          id="featured-products-title"
          title="Öne Çıkan Ürünler"
          description="Editörlerimizin seçtiği en popüler teknoloji ürünleri"
        />
        {products.length ? (
          <MobileShowcaseCarousel>
            {products.slice(0, 8).map((product) => (
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
            Öne çıkan ürün bulunmuyor.
          </p>
        )}
      </Container>
    </RevealSection>
  );
}
