"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Şifre yenileme bağlantısı doğrulanıyor…");

  useEffect(() => {
    const completeRecovery = async () => {
      const supabase = createClient();
      if (!supabase) {
        setMessage("Supabase Auth yapılandırılmamış.");
        return;
      }

      const query = new URLSearchParams(window.location.search);
      const fragment = new URLSearchParams(window.location.hash.slice(1));
      const errorDescription =
        query.get("error_description") ?? fragment.get("error_description");

      if (errorDescription) {
        router.replace(
          `/sifremi-unuttum?hata=${encodeURIComponent(errorDescription)}`,
        );
        return;
      }

      const code = query.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          router.replace("/sifre-yenile");
          return;
        }
      }

      const accessToken = fragment.get("access_token");
      const refreshToken = fragment.get("refresh_token");
      const type = fragment.get("type");

      if (accessToken && refreshToken && type === "recovery") {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (!error) {
          router.replace("/sifre-yenile");
          return;
        }
      }

      const { data } = await supabase.auth.getSession();
      if (data.session) {
        router.replace("/sifre-yenile");
        return;
      }

      router.replace(
        "/sifremi-unuttum?hata=gecersiz-veya-suresi-dolmus-baglanti",
      );
    };

    void completeRecovery().catch(() => {
      setMessage("Şifre yenileme bağlantısı doğrulanamadı.");
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
