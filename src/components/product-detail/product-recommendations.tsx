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
  return (
    <section className="py-14 sm:py-16">
      <SectionTitle eyebrow={eyebrow} title={title} />
      <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {products.slice(0, 4).map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
