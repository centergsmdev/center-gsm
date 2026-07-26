import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");
  const destination = next?.startsWith("/") && !next.startsWith("//")
    ? next
    : "/sifre-yenile";

  if (code) {
    const supabase = await createClient();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(new URL(destination, url.origin));
    }
  }

  const errorUrl = new URL("/sifremi-unuttum", url.origin);
  errorUrl.searchParams.set("hata", "gecersiz-veya-suresi-dolmus-baglanti");
  return NextResponse.redirect(errorUrl);
}
