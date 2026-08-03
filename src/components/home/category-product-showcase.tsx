import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { ProductCard } from "@/components/catalog/product-card";
import { AnimatedCard, RevealSection } from "@/components/motion/motion-system";
import { Container } from "@/components/ui/container";
import { SectionTitle } from "@/components/ui/section-title";
import { cn } from "@/lib/utils";
import type { CatalogProduct } from "@/types/product";
import { HomepageProductCarousel } from "./mobile-showcase-carousel";

type CategoryProductShowcaseProps = {
  id: string;
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
  products: CatalogProduct[];
  muted?: boolean;
};

export function CategoryProductShowcase({
  id,
  title,
  description,
  actionLabel,
  actionHref,
  products,
  muted = false,
}: CategoryProductShowcaseProps) {
  const titleId = `${id}-title`;
  const visibleProducts = products.slice(0, 8);

  return (
    <RevealSection
      id={id}
      aria-labelledby={titleId}
      className={cn(
        "py-8 sm:py-14",
        muted && "border-y border-zinc-200/80 bg-zinc-50/70",
      )}
    >
      <Container>
        <SectionTitle
          id={titleId}
          title={title}
          description={description}
          action={{ label: actionLabel, href: actionHref }}
        />
        <Link
          href={actionHref}
          className="mb-5 ml-auto flex w-fit items-center gap-2 text-sm font-semibold text-zinc-600 transition-colors hover:text-primary sm:hidden"
        >
          {actionLabel}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
        {visibleProducts.length ? (
          <HomepageProductCarousel>
            {visibleProducts.map((product) => (
              <AnimatedCard
                key={product.id}
                className="h-full !transform-none !opacity-100"
              >
                <ProductCard product={product} compactMobile denseMobile />
              </AnimatedCard>
            ))}
          </HomepageProductCarousel>
        ) : (
          <p className="home-premium-surface rounded-2xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">
            Bu kategoride gösterilecek ürün bulunmuyor.
          </p>
        )}
      </Container>
    </RevealSection>
  );
}
