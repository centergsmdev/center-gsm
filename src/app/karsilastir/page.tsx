"use client";

import { ComparisonBreadcrumb } from "@/components/comparison/comparison-breadcrumb";
import { ComparisonEmptyState } from "@/components/comparison/comparison-empty-state";
import { ComparisonTable } from "@/components/comparison/comparison-table";
import { Container } from "@/components/ui/container";
import { useComparison } from "@/providers/comparison-provider";

export default function ComparisonPage() {
  const { count } = useComparison();
  return (
    <main className="min-h-screen bg-surface-subtle/50 pb-16 pt-6 sm:pb-20 sm:pt-8">
      <Container>
        <ComparisonBreadcrumb />
        <div className="mb-8 mt-6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">
            Doğru seçimi kolaylaştırın
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.045em] sm:text-4xl">
            Ürün Karşılaştırma
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
            En fazla dört ürünü fiyat, teslimat ve teknik özellikleriyle yan
            yana inceleyin.
          </p>
        </div>
        {count > 0 ? <ComparisonTable /> : <ComparisonEmptyState />}
      </Container>
    </main>
  );
}
