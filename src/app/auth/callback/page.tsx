"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Oturum bağlantısı doğrulanıyor…");

  useEffect(() => {
    const completeAuth = async () => {
      const supabase = createClient();
      if (!supabase) {
        setMessage("Supabase Auth yapılandırılmamış.");
        return;
      }

      const query = new URLSearchParams(window.location.search);
      const fragment = new URLSearchParams(window.location.hash.slice(1));
      const flowType = query.get("type") ?? fragment.get("type");
      const requestedNext = query.get("next");
      const isRecovery =
        flowType === "recovery" || requestedNext === "/sifre-yenile";
      const nextPath =
        requestedNext?.startsWith("/") && !requestedNext.startsWith("//")
          ? requestedNext
          : "/hesabim";
      const errorDescription =
        query.get("error_description") ?? fragment.get("error_description");

      if (errorDescription) {
        router.replace(
          isRecovery
            ? `/sifremi-unuttum?hata=${encodeURIComponent(errorDescription)}`
            : `/giris?hata=${encodeURIComponent(errorDescription)}`,
        );
        return;
      }

      const code = query.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          router.replace(isRecovery ? "/sifre-yenile" : nextPath);
          return;
        }
        if (process.env.NODE_ENV !== "production")
          console.error("Auth code exchange failed", {
            code: error.code,
            message: error.message,
            status: error.status,
            stack: error.stack ?? new Error().stack,
          });
        router.replace(
          isRecovery
            ? "/sifremi-unuttum?hata=gecersiz-veya-suresi-dolmus-baglanti"
            : "/giris?hata=gecersiz-veya-suresi-dolmus-dogrulama",
        );
        return;
      }

      const accessToken = fragment.get("access_token");
      const refreshToken = fragment.get("refresh_token");
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (!error) {
          router.replace(isRecovery ? "/sifre-yenile" : nextPath);
          return;
        }
        if (process.env.NODE_ENV !== "production")
          console.error("Auth callback session creation failed", {
            code: error.code,
            message: error.message,
            status: error.status,
            stack: error.stack ?? new Error().stack,
          });
        router.replace(
          isRecovery
            ? "/sifremi-unuttum?hata=gecersiz-veya-suresi-dolmus-baglanti"
            : "/giris?hata=gecersiz-veya-suresi-dolmus-dogrulama",
        );
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (data.session) {
        router.replace(isRecovery ? "/sifre-yenile" : nextPath);
        return;
      }

      router.replace(
        isRecovery
          ? "/sifremi-unuttum?hata=gecersiz-veya-suresi-dolmus-baglanti"
          : "/giris?hata=gecersiz-veya-suresi-dolmus-dogrulama",
      );
    };

    void completeAuth().catch((error) => {
      if (process.env.NODE_ENV !== "production")
        console.error("Auth callback failed", {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : new Error().stack,
        });
      setMessage("Oturum bağlantısı doğrulanamadı.");
    });
  }, [router]);

  return (
    <main className="grid min-h-screen place-items-center px-6 text-center">
      <p className="text-sm font-semibold text-zinc-600" role="status">
        {message}
      </p>
    </main>
  );
}
