import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";

export function adminSecurityError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

export async function requireLiveChatAdmin(request?: Request) {
  if (request && !isSameOrigin(request))
    return {
      user: null,
      service: null,
      error: adminSecurityError("Geçersiz istek kaynağı.", 403),
    };
  const auth = await createClient();
  if (!auth)
    return {
      user: null,
      service: null,
      error: adminSecurityError("Sunucu bağlantısı kurulamadı.", 503),
    };
  const result = await auth.auth.getUser();
  const user = result.data.user;
  if (!user || user.app_metadata.role !== "admin")
    return {
      user: null,
      service: null,
      error: adminSecurityError("Bu işlem için yetkiniz yok.", 403),
    };
  const service = createServiceClient();
  if (!service)
    return {
      user: null,
      service: null,
      error: adminSecurityError("Sunucu bağlantısı kurulamadı.", 503),
    };
  return { user, service, error: null };
}
