import { ProductCard } from "@/components/catalog/product-card";
import { SectionTitle } from "@/components/ui/section-title";
import type { CatalogProduct } from "@/types/product";

export function ProductRecommendations({
  title,
  eyebrow,
  products,
}: {
  title: string;
  eyebrow: string;
  products: CatalogProduct[];
}) {
  if (!products.length) return null;
  return (
    <section className="py-12 sm:py-16">
      <SectionTitle eyebrow={eyebrow} title={title} />
      <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-4 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden">
        {products.slice(0, 4).map((product) => (
          <div
            key={product.id}
            className="w-[82%] shrink-0 snap-start min-[480px]:w-[46%] md:w-[31%] lg:w-[calc((100%-3rem)/4)]"
          >
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
}
