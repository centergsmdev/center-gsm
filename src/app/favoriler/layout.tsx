import type { ReactNode } from "react";

import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { generateSeoMetadata, PRIVATE_ROBOTS } from "@/lib/seo/seo";

export const metadata = generateSeoMetadata({
  title: "Favorilerim",
  description: "CENTER GSM favori teknoloji ürünleri.",
  canonical: "/favoriler",
  robots: PRIVATE_ROBOTS,
});

export default function FavoritesLayout({
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
