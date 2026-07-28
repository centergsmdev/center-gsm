import type { ReactNode } from "react";

import { generateSeoMetadata, PRIVATE_ROBOTS } from "@/lib/seo/seo";

export const metadata = generateSeoMetadata({
  title: "Güvenli Oturum Doğrulaması",
  description: "CENTER GSM güvenli oturum doğrulama işlemi.",
  canonical: "/auth/callback",
  robots: PRIVATE_ROBOTS,
  social: false,
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
