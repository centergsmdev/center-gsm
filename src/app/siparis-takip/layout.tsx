import type { ReactNode } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { generateSeoMetadata } from "@/lib/seo/seo";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = generateSeoMetadata({
  title: "Sipariş Takibi",
  description:
    "CENTER GSM siparişinizin güncel kargo ve teslimat durumunu güvenle sorgulayın.",
  canonical: "/siparis-takip",
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
