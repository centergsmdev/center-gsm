import type { ReactNode } from "react";

import { generateSeoMetadata, PRIVATE_ROBOTS } from "@/lib/seo/seo";

export const metadata = generateSeoMetadata({
  title: "Şifremi Unuttum",
  description:
    "CENTER GSM hesabınız için güvenli şifre yenileme bağlantısı isteyin.",
  canonical: "/sifremi-unuttum",
  robots: PRIVATE_ROBOTS,
  social: false,
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
