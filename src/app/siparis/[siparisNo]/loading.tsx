import { Container } from "@/components/ui/container";
import { Skeleton } from "@/components/ui/skeleton";
export default function OrderDetailLoading() {
  return (
    <main className="min-h-screen py-8">
      <Container>
        <Skeleton className="h-4 w-44" />
        <Skeleton className="mt-8 h-10 w-72" />
        <Skeleton className="mt-7 h-44 rounded-xl" />
        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_340px]">
          <Skeleton className="h-[520px] rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </Container>
    </main>
  );
}
