import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { ProductVisual } from "@/components/catalog/product-visual";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { SectionTitle } from "@/components/ui/section-title";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
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
      className="tech-panel-dark py-12 sm:py-16"
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
          <div className="stagger-grid grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {discountedProducts.map((product) => (
              <article
                key={product.id}
                className="home-premium-interactive home-premium-surface group overflow-hidden border border-white/10 bg-white"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-zinc-100">
                  <ProductVisual
                    product={product}
                    performancePreset="product-card"
                  />
                  <div className="absolute left-4 top-4 z-raised flex flex-col items-start gap-2">
                    <Badge variant="brand">Kampanya</Badge>
                    <Badge variant="dark">%{product.discountRate} indirim</Badge>
                  </div>
                </div>
                <div className="flex min-h-56 flex-col p-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                    {product.brand}
                  </p>
                  <h3 className="mt-2 text-lg font-black tracking-[-0.035em] text-zinc-950">
                    {product.model}
                  </h3>
                  <div className="mt-auto pt-5">
                    <p className="text-sm font-medium text-zinc-400 line-through">
                      {formatCurrency(product.previousPrice!)}
                    </p>
                    <p className="mt-1 text-2xl font-black tracking-[-0.045em] text-zinc-950">
                      {formatCurrency(product.price)}
                    </p>
                    <Link
                      href={`/urun/${product.slug}`}
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" }),
                        "mt-5 w-full border-zinc-200 bg-zinc-950 text-white hover:border-zinc-950 hover:bg-primary",
                      )}
                    >
                      İncele
                      <ArrowUpRight
                        className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                        aria-hidden="true"
                      />
                    </Link>
                  </div>
                </div>
              </article>
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
