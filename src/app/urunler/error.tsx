"use client";

import { CatalogErrorState } from "@/components/catalog/catalog-states";
import { Container } from "@/components/ui/container";

export default function ProductsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-[60vh] py-12">
      <Container>
        <CatalogErrorState onRetry={reset} />
      </Container>
    </main>
  );
}
