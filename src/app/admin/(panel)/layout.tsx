import type { ReactNode } from "react";
import { AdminGuard } from "@/components/admin/admin-guard";
import { AdminShell } from "@/components/admin/admin-shell";

export default function AdminPanelLayout({ children }: { children: ReactNode }) {
  return <AdminGuard><AdminShell>{children}</AdminShell></AdminGuard>;
}
