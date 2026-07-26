import { SearchLoadingSkeleton } from "@/components/search/search-loading-skeleton";
import { Container } from "@/components/ui/container";

export default function SearchLoading() {
  return (
    <main className="min-h-screen bg-surface-subtle/50 py-8">
      <Container>
        <SearchLoadingSkeleton />
      </Container>
    </main>
  );
}
