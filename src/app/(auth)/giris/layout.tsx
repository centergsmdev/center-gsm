import type { ReactNode } from "react";
import { generateSeoMetadata } from "@/lib/seo/seo";
export const metadata = generateSeoMetadata({
  title: "Giriş Yap",
  description: "CENTER GSM hesabınıza güvenli şekilde giriş yapın.",
  canonical: "/giris",
  robots: { index: true, follow: true },
  social: false,
});
export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
