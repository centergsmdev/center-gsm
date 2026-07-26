import type { ReactNode } from "react";
import { Footer } from "@/components/layout/footer";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export default function AuthLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <>
      {children}
      <Footer />
    </>
  );
}
