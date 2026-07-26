"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/providers/admin-auth-provider";
import { AdminLoadingState } from "./admin-states";

export function AdminGuard({ children }: { children: ReactNode }) {
  const { isReady, user } = useAdminAuth();
  const router = useRouter();
  useEffect(() => { if (isReady && !user) router.replace("/admin/giris"); }, [isReady, router, user]);
  if (!isReady || !user) return <div className="grid min-h-screen place-items-center bg-zinc-50"><AdminLoadingState /></div>;
  return children;
}
