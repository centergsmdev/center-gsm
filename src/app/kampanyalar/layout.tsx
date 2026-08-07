import type { ReactNode } from "react";

import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { generateSeoMetadata } from "@/lib/seo/seo";

export const metadata = generateSeoMetadata({
  title: "Kampanyalar",
  description:
    "CENTER GSM'de yüzde 18 ve üzeri indirimli teknoloji ürünlerini keşfedin.",
  canonical: "/kampanyalar",
  category: "Teknoloji Kampanyaları",
});

export default function CampaignsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      {children}
      <Footer />
    </>
  );
}
