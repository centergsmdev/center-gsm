"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { LoadingState } from "@/components/ui/feedback-state";
import { useAuth } from "@/providers/auth-provider";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isReady } = useAuth();
  useEffect(() => {
    if (isReady && !isAuthenticated)
      router.replace("/giris?returnUrl=/hesabim");
  }, [isAuthenticated, isReady, router]);
  if (!isReady || !isAuthenticated)
    return (
      <LoadingState
        title="Hesabınız hazırlanıyor"
        description="Güvenli hesap alanına yönlendiriliyorsunuz."
        className="min-h-[50vh] border-0"
      />
    );
  return children;
}
