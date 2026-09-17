import { NextResponse } from "next/server";

import { requireAdminDeletionPassword } from "@/lib/admin/deletion-password";
import { requireAdmin } from "@/lib/admin/require-admin";
import { isUuid } from "@/lib/installment/validation";
import { PAYMENT_RECEIPTS_BUCKET } from "@/lib/payment-receipts/client";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

export const runtime = "nodejs";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params;
  if (!isUuid(orderId))
    return NextResponse.json(
      { error: "Sipariş kimliği geçersiz." },
      { status: 400 },
    );

  const admin = await requireAdmin(request);
  if (admin.error) return admin.error;

  let body: { password?: unknown; orderNumber?: unknown };
  try {
    body = (await request.json()) as {
      password?: unknown;
      orderNumber?: unknown;
    };
  } catch {
    return NextResponse.json(
      { error: "Silme bilgileri okunamadı." },
      { status: 400 },
    );
  }

  const passwordError = await requireAdminDeletionPassword(
    admin.service,
    body.password,
  );
  if (passwordError) return passwordError;

  const orderNumber =
    typeof body.orderNumber === "string" ? body.orderNumber.trim() : "";
  if (!orderNumber)
    return NextResponse.json(
      { error: "Sipariş numarası geçersiz." },
      { status: 400 },
    );

  const session = await createClient();
  if (!session)
    return NextResponse.json(
      { error: "Sunucu bağlantısı kurulamadı." },
      { status: 503 },
    );
  const result = await session.rpc("admin_hard_delete_order", {
    p_order_id: orderId,
    p_order_number: orderNumber,
  });
  if (result.error || !result.data || typeof result.data !== "object") {
    console.error("Order hard delete failed", {
      code: result.error?.code,
      message: result.error?.message,
    });
    return NextResponse.json({ error: "Sipariş silinemedi." }, { status: 500 });
  }

  const payload = result.data as Record<string, Json | undefined>;
  const receiptPaths = Array.isArray(payload.receipt_paths)
    ? payload.receipt_paths.filter(
        (path): path is string => typeof path === "string",
      )
    : [];
  const returnPaths = Array.isArray(payload.return_attachment_paths)
    ? payload.return_attachment_paths.filter(
        (path): path is string => typeof path === "string",
      )
    : [];
  const removals = await Promise.all([
    receiptPaths.length
      ? admin.service.storage.from(PAYMENT_RECEIPTS_BUCKET).remove(receiptPaths)
      : Promise.resolve({ error: null }),
    returnPaths.length
      ? admin.service.storage.from("return-attachments").remove(returnPaths)
      : Promise.resolve({ error: null }),
  ]);

  return NextResponse.json(
    {
      ok: true,
      warning: removals.some((item) => item.error)
        ? "Sipariş silindi ancak bazı özel dosyalar temizlenemedi."
        : null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
