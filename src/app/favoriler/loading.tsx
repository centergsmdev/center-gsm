import { FavoritesLoadingSkeleton } from "@/components/favorites/favorites-loading-skeleton";
import { Container } from "@/components/ui/container";

export default function FavoritesLoading() {
  return (
    <main className="min-h-screen bg-surface-subtle/50 py-8">
      <Container>
        <FavoritesLoadingSkeleton />
      </Container>
    </main>
  );
}
