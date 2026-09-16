import "server-only";

import { NextResponse } from "next/server";

import { authApi } from "@/lib/supabase/auth-api";
import { createServiceClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function requireAdmin(request?: Request) {
  if (request) {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin)
      return {
        user: null,
        service: null,
        error: NextResponse.json(
          { error: "Geçersiz istek kaynağı." },
          { status: 403 },
        ),
      };
  }

  const session = await createClient();
  if (!session)
    return {
      user: null,
      service: null,
      error: NextResponse.json(
        { error: "Sunucu bağlantısı kurulamadı." },
        { status: 503 },
      ),
    };
  const result = await authApi(session).getUser();
  const user = result.data.user;
  if (result.error || !user || user.app_metadata.role !== "admin")
    return {
      user: null,
      service: null,
      error: NextResponse.json(
        { error: "Bu işlem için yetkiniz yok." },
        { status: 403 },
      ),
    };
  const service = createServiceClient();
  if (!service)
    return {
      user: null,
      service: null,
      error: NextResponse.json(
        { error: "Sunucu bağlantısı kurulamadı." },
        { status: 503 },
      ),
    };
  return { user, service, error: null };
}
