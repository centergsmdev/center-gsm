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
      aria-label="Kampanyalar"
      className="tech-panel-dark py-5 sm:py-11"
    >
      <Container>
        <h2
          id="deals-title"
          className="mb-3 text-xs font-black uppercase tracking-[0.24em] text-white sm:hidden"
        >
          Kampanyalar
        </h2>
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
          <div
            className="stagger-grid -mx-4 flex snap-x snap-mandatory gap-2.5 overflow-x-auto scroll-smooth px-4 pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] sm:-mx-6 sm:gap-3 sm:px-6 sm:pb-2 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0 lg:pb-0 [&::-webkit-scrollbar]:hidden"
            aria-label="Kampanyalı ürünler"
          >
            {discountedProducts.map((product) => (
              <div
                key={product.id}
                className="w-[72%] shrink-0 snap-start min-[480px]:w-[42%] md:w-[31%] lg:w-auto"
              >
                <ProductCard product={product} compactMobile />
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
