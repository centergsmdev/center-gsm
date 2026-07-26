import { Container } from "@/components/ui/container";
import { Skeleton } from "@/components/ui/skeleton";
export default function AccountLoading() {
  return (
    <main className="min-h-screen py-10">
      <Container>
        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <Skeleton className="h-[480px] rounded-xl" />
          <div>
            <Skeleton className="h-10 w-64" />
            <Skeleton className="mt-3 h-5 max-w-lg" />
            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-28 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </Container>
    </main>
  );
}
