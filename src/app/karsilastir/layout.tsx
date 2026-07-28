import type { ReactNode } from "react";

import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { generateSeoMetadata, PRIVATE_ROBOTS } from "@/lib/seo/seo";

export const metadata = generateSeoMetadata({
  title: "Ürün Karşılaştırma",
  description:
    "Teknoloji ürünlerini özellik, fiyat ve teslimat avantajlarıyla karşılaştırın.",
  canonical: "/karsilastir",
  robots: PRIVATE_ROBOTS,
});

export default function ComparisonLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <>
      <Header />
      {children}
      <Footer />
    </>
  );
}
