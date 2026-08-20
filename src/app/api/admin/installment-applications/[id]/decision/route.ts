import { NextResponse } from "next/server";

import { getAdminContext, mapAdminApplication } from "@/lib/installment/server";
import { sameOriginRequest } from "@/lib/installment/server-security";
import { isUuid } from "@/lib/installment/validation";

export const runtime = "nodejs";

const error = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!sameOriginRequest(request)) return error("Geçersiz istek kaynağı.", 403);
  const { id } = await params;
  if (!isUuid(id)) return error("Başvuru kimliği geçersiz.");
  const context = await getAdminContext();
  if (!context) return error("Admin yetkisi gerekiyor.", 403);
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return error("Karar bilgileri okunamadı.");
  }
  const action = String(body.action ?? "");
  const revision = Number(body.revision);
  const publicReason = String(body.publicReason ?? "").trim();
  const internalNote = String(body.internalNote ?? "").trim();
  if (!Number.isInteger(revision) || revision < 1)
    return error("Başvuru revizyonu geçersiz.");
  if (!(["review", "approve", "reject"] as const).includes(action as never))
    return error("Karar işlemi geçersiz.");
  if (action === "reject" && publicReason.length < 3)
    return error("Müşteriye gösterilecek ret nedenini girin.");
  if (publicReason.length > 1000 || internalNote.length > 2000)
    return error("Karar notu izin verilen uzunluğu aşıyor.");

  const transition = await context.session.rpc(
    "admin_transition_installment_application",
    {
      p_application_id: id,
      p_expected_revision: revision,
      p_action: action as "review" | "approve" | "reject",
      p_public_reason: publicReason || null,
      p_internal_note: internalNote || null,
    },
  );
  if (transition.error) {
    const message = transition.error.message;
    if (message.includes("revision_conflict"))
      return error(
        "Başvuru başka bir yönetici tarafından güncellendi. Sayfayı yenileyin.",
        409,
      );
    if (
      message.includes("invalid_status_transition") ||
      message.includes("review_required")
    )
      return error("Bu durum geçişine izin verilmiyor.", 409);
    return error("Karar kaydedilemedi.", 500);
  }
  const updated = await context.service
    .from("installment_applications")
    .select("*")
    .eq("id", id)
    .single();
  if (updated.error || !updated.data)
    return error("Güncel başvuru yüklenemedi.", 500);
  return NextResponse.json(
    { item: mapAdminApplication(updated.data) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
