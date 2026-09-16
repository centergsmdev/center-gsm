import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin/require-admin";
import { isUuid } from "@/lib/installment/validation";
import { PAYMENT_RECEIPTS_BUCKET } from "@/lib/payment-receipts/client";

export const runtime = "nodejs";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ receiptId: string }> },
) {
  const { receiptId } = await params;
  if (!isUuid(receiptId))
    return NextResponse.json(
      { error: "Dekont kimliği geçersiz." },
      { status: 400 },
    );

  const admin = await requireAdmin(request);
  if (admin.error) return admin.error;

  const removed = await admin.service
    .from("payment_receipts")
    .delete()
    .eq("id", receiptId)
    .select("storage_path")
    .maybeSingle();
  if (removed.error)
    return NextResponse.json({ error: "Dekont silinemedi." }, { status: 500 });
  if (!removed.data)
    return NextResponse.json({ error: "Dekont bulunamadı." }, { status: 404 });

  const storage = await admin.service.storage
    .from(PAYMENT_RECEIPTS_BUCKET)
    .remove([removed.data.storage_path]);

  return NextResponse.json(
    {
      ok: true,
      warning: storage.error
        ? "Dekont kaydı silindi ancak özel dosya depodan temizlenemedi."
        : null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
