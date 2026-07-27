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
          <div className="stagger-grid grid grid-cols-1 gap-3 min-[430px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {discountedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
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
