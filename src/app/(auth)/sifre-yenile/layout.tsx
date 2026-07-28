import type { ReactNode } from "react";

import { generateSeoMetadata, PRIVATE_ROBOTS } from "@/lib/seo/seo";

export const metadata = generateSeoMetadata({
  title: "Şifre Yenile",
  description: "CENTER GSM hesabınız için yeni şifrenizi güvenle belirleyin.",
  canonical: "/sifre-yenile",
  robots: PRIVATE_ROBOTS,
  social: false,
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
