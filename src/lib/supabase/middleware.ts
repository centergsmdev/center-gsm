import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { getSupabasePublicConfig } from "@/lib/supabase/config";
import type { Database } from "@/types/database";
import { authApi } from "@/lib/supabase/auth-api";
import { resolveSiteAccessBlock } from "@/lib/live-chat/site-block";

export async function updateSupabaseSession(request: NextRequest) {
  const config = getSupabasePublicConfig();
  let response = NextResponse.next({ request });
  if (!config) return response;
  const client = createServerClient<Database>(config.url, config.anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (
        cookies: Array<{ name: string; value: string; options: CookieOptions }>,
      ) => {
        cookies.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookies.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });
  const { data } = await authApi(client).getUser();
  const user = data.user;
  const path = request.nextUrl.pathname;
  if (path.startsWith("/hesabim") && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/giris";
    url.searchParams.set("returnUrl", path);
    return NextResponse.redirect(url);
  }
  if (path.startsWith("/admin") && path !== "/admin/giris") {
    if (!user || user.app_metadata.role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/giris";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }
  if (path !== "/erisim-kisitli" && !path.startsWith("/admin")) {
    const siteBlock = await resolveSiteAccessBlock(
      request,
      user?.id ?? null,
      user?.app_metadata.role === "admin",
    );
    if (siteBlock) {
      if (path.startsWith("/api/"))
        return NextResponse.json(
          { error: "Bu hizmete erişim şu anda kullanılamıyor." },
          { status: 403 },
        );
      const denied = request.nextUrl.clone();
      denied.pathname = "/erisim-kisitli";
      denied.search = "";
      return NextResponse.rewrite(denied, { status: 403 });
    }
  }
  return response;
}
