import { ProductCard } from "@/components/catalog/product-card";
import { Container } from "@/components/ui/container";
import { SectionTitle } from "@/components/ui/section-title";
import type { CatalogProduct } from "@/types/product";

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
    <section
      id="deals"
      aria-labelledby="deals-title"
      className="tech-panel-dark py-9 sm:py-11"
    >
      <Container>
        <SectionTitle
          id="deals-title"
          inverted
          eyebrow="Seçili fırsatlar"
          title="Kaçırılmayacak teknoloji fırsatları"
          description="Sınırlı süreli fiyatlarla öne çıkan premium teknoloji ürünlerini keşfedin."
          action={{ label: "Tüm fırsatlar", href: "/urunler?sirala=popular" }}
        />
        {discountedProducts.length ? (
          <div
            className="stagger-grid -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-4 pb-2 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0 lg:pb-0 [&::-webkit-scrollbar]:hidden"
            aria-label="Kampanyalı ürünler"
          >
            {discountedProducts.map((product) => (
              <div
                key={product.id}
                className="w-[82%] shrink-0 snap-start min-[480px]:w-[46%] md:w-[31%] lg:w-auto"
              >
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        ) : (
          <p className="home-premium-surface border border-white/10 bg-white/5 p-8 text-center text-sm text-zinc-400">
            Aktif kampanyalı ürün bulunmuyor.
          </p>
        )}
      </Container>
    </section>
  );
}
