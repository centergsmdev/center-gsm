"use client";

import { ComparisonErrorState } from "@/components/comparison/comparison-error-state";
import { Container } from "@/components/ui/container";

export default function ComparisonError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-[60vh] py-12">
      <Container>
        <ComparisonErrorState onRetry={reset} />
      </Container>
    </main>
  );
}
