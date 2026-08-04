import type { ReactNode } from "react";
import { AccountNavigation } from "@/components/account/account-navigation";
import { AuthGuard } from "@/components/account/auth-guard";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/ui/container";
import { generateSeoMetadata, PRIVATE_ROBOTS } from "@/lib/seo/seo";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = generateSeoMetadata({
  title: "Hesabım",
  canonical: "/hesabim",
  robots: PRIVATE_ROBOTS,
});
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <Header />
      <main className="min-h-screen bg-zinc-50 py-8">
        <Container>
          <div className="grid min-w-0 gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
            <AccountNavigation />
            <div className="min-w-0">{children}</div>
          </div>
        </Container>
      </main>
      <Footer />
    </AuthGuard>
  );
}
