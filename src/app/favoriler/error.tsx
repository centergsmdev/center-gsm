"use client";

import { FavoritesErrorState } from "@/components/favorites/favorites-error-state";
import { Container } from "@/components/ui/container";

export default function FavoritesError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-[60vh] py-12">
      <Container>
        <FavoritesErrorState onRetry={reset} />
      </Container>
    </main>
  );
}
