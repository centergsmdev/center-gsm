import { NextResponse } from "next/server";

import { newPortalAccessExpiry } from "@/lib/installment/customer-portal-security";
import { getAdminContext } from "@/lib/installment/server";
import { sameOriginRequest } from "@/lib/installment/server-security";
import {
  INSTALLMENT_PORTAL_STAGES,
  type InstallmentPortalStage,
} from "@/lib/installment/types";
import { isUuid } from "@/lib/installment/validation";

export const runtime = "nodejs";

const error = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status });

function parseDueAt(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return { value: null, valid: true } as const;
  const date = new Date(text);
  const now = Date.now();
  const milliseconds = date.getTime();
  return {
    value: Number.isFinite(milliseconds) ? date.toISOString() : null,
    valid:
      Number.isFinite(milliseconds) &&
      milliseconds > now - 5 * 60 * 1000 &&
      milliseconds < now + 90 * 24 * 60 * 60 * 1000,
  } as const;
}

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
    return error("Portal bilgileri okunamadı.");
  }
  const action = String(body.action ?? "");
  const application = await context.service
    .from("installment_applications")
    .select("id,application_number,status")
    .eq("id", id)
    .maybeSingle();
  if (application.error)
    return error("Başvuru kontrol edilemedi.", 500);
  if (!application.data) return error("Başvuru bulunamadı.", 404);
  if (application.data.status !== "approved")
    return error("Müşteri sayfası yalnız onaylı başvurular için hazırlanabilir.", 409);

  const existing = await context.service
    .from("installment_customer_portals")
    .select("*")
    .eq("application_id", id)
    .maybeSingle();
  if (existing.error) return error("Müşteri sayfası yüklenemedi.", 500);

  if (action === "configure") {
    const paymentAccountId = String(body.paymentAccountId ?? "");
    if (!isUuid(paymentAccountId)) return error("Ödeme hesabını seçin.");
    const dueAt = parseDueAt(body.paymentDueAt);
    if (!dueAt.valid)
      return error("Peşinat için geçerli bir son ödeme tarihi seçin.");
    const [paymentPlan, paymentAccount] = await Promise.all([
      context.service
        .from("installment_application_payment_plans")
        .select("application_id")
        .eq("application_id", id)
        .maybeSingle(),
      context.service
        .from("payment_accounts")
        .select("*")
        .eq("id", paymentAccountId)
        .eq("is_active", true)
        .maybeSingle(),
    ]);
    if (paymentPlan.error || paymentAccount.error)
      return error("Ödeme bilgileri doğrulanamadı.", 500);
    if (!paymentPlan.data)
      return error("Bu başvuruda kayıtlı ödeme planı bulunmuyor.", 409);
    if (!paymentAccount.data)
      return error("Seçilen ödeme hesabı aktif değil.", 409);
    const account = paymentAccount.data;
    const snapshot = {
      id: account.id,
      bank_name: account.bank_name,
      account_holder: account.account_holder,
      iban: account.iban,
      branch: account.branch,
      description: account.description,
    };
    const accessExpiresAt = newPortalAccessExpiry();
    const saved = existing.data
      ? await context.service
          .from("installment_customer_portals")
          .update({
            payment_account_id: account.id,
            payment_account_snapshot: snapshot,
            payment_due_at: dueAt.value,
            access_version: existing.data.access_version + 1,
            access_expires_at: accessExpiresAt,
            updated_by: context.user.id,
          })
          .eq("id", existing.data.id)
          .select("id")
          .single()
      : await context.service
          .from("installment_customer_portals")
          .insert({
            application_id: id,
            payment_account_id: account.id,
            payment_account_snapshot: snapshot,
            payment_due_at: dueAt.value,
            access_expires_at: accessExpiresAt,
            created_by: context.user.id,
            updated_by: context.user.id,
          })
          .select("id")
          .single();
    if (saved.error) return error("Müşteri sayfası kaydedilemedi.", 500);
    await context.service.from("installment_application_events").insert({
      application_id: id,
      event_type: existing.data
        ? "portal.payment_account_updated"
        : "portal.created",
      actor_type: "admin",
      actor_user_id: context.user.id,
      metadata: {
        portal_id: saved.data.id,
        payment_account_id: account.id,
        has_payment_due_at: Boolean(dueAt.value),
      },
    });
    return NextResponse.json({ ok: true });
  }

  if (!existing.data)
    return error("Önce müşteri sayfasını hazırlayın.", 409);

  if (action === "update_stage") {
    const stage = String(body.stage ?? "") as InstallmentPortalStage;
    const publicNote = String(body.publicNote ?? "").trim();
    if (!INSTALLMENT_PORTAL_STAGES.includes(stage))
      return error("İşlem aşaması geçersiz.");
    if (publicNote.length > 600)
      return error("Müşteriye gösterilecek not 600 karakteri aşamaz.");
    const updated = await context.service
      .from("installment_customer_portals")
      .update({
        stage,
        public_note: publicNote || null,
        updated_by: context.user.id,
      })
      .eq("id", existing.data.id);
    if (updated.error) return error("İşlem aşaması güncellenemedi.", 500);
    await context.service.from("installment_application_events").insert({
      application_id: id,
      event_type: "portal.stage_changed",
      actor_type: "admin",
      actor_user_id: context.user.id,
      metadata: {
        from_stage: existing.data.stage,
        to_stage: stage,
        has_public_note: Boolean(publicNote),
      },
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "renew") {
    const updated = await context.service
      .from("installment_customer_portals")
      .update({
        access_version: existing.data.access_version + 1,
        access_expires_at: newPortalAccessExpiry(),
        updated_by: context.user.id,
      })
      .eq("id", existing.data.id);
    if (updated.error) return error("Güvenli bağlantı yenilenemedi.", 500);
    await context.service.from("installment_application_events").insert({
      application_id: id,
      event_type: "portal.access_renewed",
      actor_type: "admin",
      actor_user_id: context.user.id,
      metadata: { portal_id: existing.data.id },
    });
    return NextResponse.json({ ok: true });
  }

  return error("Portal işlemi geçersiz.");
}
