import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";

export const metadata: Metadata = {
  title: "Ürün Karşılaştırma | CENTER GSM",
  description:
    "Teknoloji ürünlerini özellik, fiyat ve teslimat avantajlarıyla karşılaştırın.",
};

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
