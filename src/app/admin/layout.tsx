import type { ReactNode } from "react";

import { AdminAuthProvider } from "@/providers/admin-auth-provider";
import { generateSeoMetadata, PRIVATE_ROBOTS } from "@/lib/seo/seo";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = generateSeoMetadata({
  title: "Yönetim Paneli",
  canonical: "/admin",
  robots: PRIVATE_ROBOTS,
});

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return <AdminAuthProvider>{children}</AdminAuthProvider>;
}
