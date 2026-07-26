import { ProductCard } from "@/components/catalog/product-card";
import { Container } from "@/components/ui/container";
import { SectionTitle } from "@/components/ui/section-title";
import type { CatalogProduct } from "@/types/product";

export function Deals({ products }: { products: CatalogProduct[] }) {
  return (
    <section
      id="deals"
      aria-labelledby="deals-title"
      className="tech-panel-dark py-10 sm:py-14"
    >
      <Container>
        <SectionTitle
          id="deals-title"
          inverted
          eyebrow="Seçili fırsatlar"
          title="Sizin için öne çıkanlar"
          description="Öne çıkan premium teknoloji ürünlerini keşfedin."
          action={{ label: "Tüm fırsatlar", href: "/urunler?sirala=popular" }}
        />
        {products.length ? (
          <div className="stagger-grid grid gap-3 min-[480px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-sm text-zinc-400">
            Öne çıkan ürünler şu anda görüntülenemiyor.
          </p>
        )}
      </Container>
    </section>
  );
}
