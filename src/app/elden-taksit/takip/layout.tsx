import type { ReactNode } from "react";

import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { generateSeoMetadata, PRIVATE_ROBOTS } from "@/lib/seo/seo";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = generateSeoMetadata({
  title: "Elden Taksit Başvuru Takibi",
  canonical: "/elden-taksit/takip",
  robots: PRIVATE_ROBOTS,
});

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      {children}
      <Footer />
    </>
  );
}
