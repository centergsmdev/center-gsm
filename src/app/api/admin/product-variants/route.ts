import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { authApi } from "@/lib/supabase/auth-api";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

export const runtime = "nodejs";

const safeError = (message: string, status: number) =>
  NextResponse.json({ data: null, error: message }, { status });

export async function POST(request: Request) {
  const db = await createClient();
  if (!db) return safeError("Supabase bağlantısı yapılandırılmamış.", 503);
  const {
    data: { user },
  } = await authApi(db).getUser();
  if (user?.app_metadata.role !== "admin")
    return safeError("Bu işlem için admin yetkisi gerekiyor.", 403);

  let payload: { productId?: string; colors?: Json; variants?: Json };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return safeError("Varyant kayıt verisi okunamadı.", 400);
  }
  if (
    !payload.productId ||
    !Array.isArray(payload.colors) ||
    !Array.isArray(payload.variants)
  )
    return safeError("Varyant kayıt verisi eksik.", 400);

  const saved = await db.rpc("admin_save_product_variant_setup", {
    p_product_id: payload.productId,
    p_colors: payload.colors,
    p_variants: payload.variants,
  });
  if (saved.error) {
    if (process.env.NODE_ENV !== "production")
      console.error("Admin product variants save failed", {
        code: saved.error.code,
        message: saved.error.message,
        details: saved.error.details,
        hint: saved.error.hint,
        stack: new Error().stack,
      });
    return NextResponse.json(
      {
        data: null,
        error: "Varyant bilgileri kaydedilemedi.",
        code: saved.error.code,
      },
      { status: 400 },
    );
  }
  const product = await db
    .from("products")
    .select("slug")
    .eq("id", payload.productId)
    .maybeSingle();
  if (product.error || !product.data)
    return safeError("Ürün bilgisi yeniden doğrulanamadı.", 400);

  revalidatePath(`/urun/${product.data.slug}`);
  revalidatePath("/");
  revalidatePath("/urunler");
  return NextResponse.json({ data: saved.data, error: null });
}
