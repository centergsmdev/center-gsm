import { NextResponse } from "next/server";

import { getAdminContext } from "@/lib/installment/server";
import { sameOriginRequest } from "@/lib/installment/server-security";
import { isUuid } from "@/lib/installment/validation";
import { PAYMENT_RECEIPTS_BUCKET } from "@/lib/payment-receipts/client";
import { requireAdminDeletionPassword } from "@/lib/admin/deletion-password";

export const runtime = "nodejs";

const error = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ receiptId: string }> },
) {
  if (!sameOriginRequest(request)) return error("Geçersiz istek kaynağı.", 403);
  const { receiptId } = await params;
  if (!isUuid(receiptId)) return error("Dekont kimliği geçersiz.");
  const context = await getAdminContext();
  if (!context) return error("Admin yetkisi gerekiyor.", 403);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return error("Onay bilgileri okunamadı.");
  }
  const status = String(body.status ?? "");
  const reason = String(body.rejectionReason ?? "").trim();
  if (status !== "approved" && status !== "rejected")
    return error("Dekont kararı geçersiz.");
  if (status === "rejected" && reason.length < 3)
    return error("Müşteriye gösterilecek ret nedenini yazın.");
  if (reason.length > 500) return error("Ret nedeni 500 karakteri aşamaz.");

  const reviewed = await context.service.rpc(
    "admin_review_installment_payment_receipt",
    {
      p_receipt_id: receiptId,
      p_status: status,
      p_rejection_reason: status === "rejected" ? reason : null,
      p_actor_user_id: context.user.id,
    },
  );
  if (reviewed.error) {
    const message = reviewed.error.message;
    if (message.includes("receipt_not_found"))
      return error("Dekont bulunamadı.", 404);
    if (message.includes("receipt_already_reviewed"))
      return error("Bu dekont daha önce sonuçlandırılmış.", 409);
    return error("Dekont kararı kaydedilemedi.", 500);
  }
  return NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ receiptId: string }> },
) {
  if (!sameOriginRequest(request)) return error("Geçersiz istek kaynağı.", 403);
  const { receiptId } = await params;
  if (!isUuid(receiptId)) return error("Dekont kimliği geçersiz.");
  const context = await getAdminContext();
  if (!context) return error("Admin yetkisi gerekiyor.", 403);

  let body: { password?: unknown };
  try {
    body = (await request.json()) as { password?: unknown };
  } catch {
    return error("Silme şifresi okunamadı.");
  }
  const passwordError = await requireAdminDeletionPassword(
    context.service,
    body.password,
  );
  if (passwordError) return passwordError;

  const removed = await context.service
    .from("installment_payment_receipts")
    .delete()
    .eq("id", receiptId)
    .select("storage_path,portal_id")
    .maybeSingle();
  if (removed.error) return error("Dekont silinemedi.", 500);
  if (!removed.data) return error("Dekont bulunamadı.", 404);

  const storage = await context.service.storage
    .from(PAYMENT_RECEIPTS_BUCKET)
    .remove([removed.data.storage_path]);
  const activeReceipt = await context.service
    .from("installment_payment_receipts")
    .select("status")
    .eq("portal_id", removed.data.portal_id)
    .is("superseded_at", null)
    .in("status", ["pending_review", "approved"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const portalStage =
    activeReceipt.data?.status === "approved"
      ? "payment_confirmed"
      : activeReceipt.data?.status === "pending_review"
        ? "payment_under_review"
        : "down_payment_pending";
  const portal = activeReceipt.error
    ? { error: activeReceipt.error }
    : await context.service
        .from("installment_customer_portals")
        .update({ stage: portalStage, updated_by: context.user.id })
        .eq("id", removed.data.portal_id);
  return NextResponse.json(
    {
      ok: true,
      warning:
        storage.error || activeReceipt.error || portal.error
          ? "Dekont silindi ancak bağlı portal veya özel dosya temizliği tamamlanamadı."
          : null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
