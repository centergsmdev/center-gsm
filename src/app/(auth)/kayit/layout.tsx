import type { ReactNode } from "react";
import { generateSeoMetadata } from "@/lib/seo/seo";
export const metadata = generateSeoMetadata({
  title: "Üye Ol",
  description:
    "CENTER GSM hesabınızı oluşturun ve alışveriş deneyiminizi yönetin.",
  canonical: "/kayit",
  robots: { index: true, follow: true },
  social: false,
});
export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
