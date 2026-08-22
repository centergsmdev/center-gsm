import { randomUUID } from "node:crypto";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { portalAccessCookieName } from "@/lib/installment/customer-portal-security";
import {
  getAuthorizedCustomerPortal,
  type InstallmentCustomerPortalReceipt,
} from "@/lib/installment/customer-portal-server";
import {
  InstallmentReceiptFileError,
  validateInstallmentReceipt,
} from "@/lib/installment/receipt-validation";
import { consumeInstallmentRateLimit } from "@/lib/installment/server";
import {
  sameOriginRequest,
  sanitizeOriginalFileName,
} from "@/lib/installment/server-security";
import { isUuid } from "@/lib/installment/validation";

export const runtime = "nodejs";

const RECEIPT_BUCKET = "payment-receipts";
const error = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status });

function mapReceipt(
  row: {
    id: string;
    original_name: string;
    status: "pending_review" | "approved" | "rejected";
    rejection_reason_public: string | null;
    uploaded_at: string;
    reviewed_at: string | null;
  } | null,
): InstallmentCustomerPortalReceipt | null {
  return row
    ? {
        id: row.id,
        originalName: row.original_name,
        status: row.status,
        rejectionReason: row.rejection_reason_public,
        uploadedAt: row.uploaded_at,
        reviewedAt: row.reviewed_at,
      }
    : null;
}

async function authorize(portalId: string) {
  const cookieStore = await cookies();
  return getAuthorizedCustomerPortal(
    portalId,
    cookieStore.get(portalAccessCookieName(portalId))?.value ?? null,
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!isUuid(id)) return error("Müşteri sayfası geçersiz.");
  const authorized = await authorize(id);
  if (!authorized) return error("Güvenli bağlantıya erişilemiyor.", 403);
  const latest = await authorized.service
    .from("installment_payment_receipts")
    .select(
      "id,original_name,status,rejection_reason_public,uploaded_at,reviewed_at",
    )
    .eq("portal_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latest.error) return error("Dekont durumu yüklenemedi.", 500);
  return NextResponse.json(
    { receipt: mapReceipt(latest.data), stage: authorized.portal.stage },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!sameOriginRequest(request)) return error("Geçersiz istek kaynağı.", 403);
  const { id } = await params;
  if (!isUuid(id)) return error("Müşteri sayfası geçersiz.");
  const authorized = await authorize(id);
  if (!authorized) return error("Güvenli bağlantıya erişilemiyor.", 403);
  const { service, portal } = authorized;
  if (
    portal.stage === "payment_confirmed" ||
    portal.stage === "preparing_delivery" ||
    portal.stage === "completed" ||
    portal.stage === "cancelled"
  )
    return error("Bu başvuru aşamasında yeni dekont yüklenemez.", 409);
  if (
    !(await consumeInstallmentRateLimit(service, request, "upload", 20, 3600))
  )
    return error(
      "Dekont yükleme sınırı aşıldı. Lütfen daha sonra tekrar deneyin.",
      429,
    );

  const existing = await service
    .from("installment_payment_receipts")
    .select("id,status")
    .eq("portal_id", id)
    .in("status", ["pending_review", "approved"])
    .maybeSingle();
  if (existing.error) return error("Dekont kaydı kontrol edilemedi.", 500);
  if (existing.data?.status === "pending_review")
    return error("Dekontunuz zaten inceleniyor.", 409);
  if (existing.data?.status === "approved")
    return error("Peşinat ödemeniz zaten onaylandı.", 409);

  let file: File | null = null;
  try {
    const form = await request.formData();
    const entry = form.get("file");
    file = entry instanceof File ? entry : null;
  } catch {
    return error("Dekont verisi okunamadı.");
  }
  if (!file) return error("Lütfen bir dekont seçin.");

  try {
    const [validated, paymentPlan] = await Promise.all([
      validateInstallmentReceipt(file),
      service
        .from("installment_application_payment_plans")
        .select("down_payment_amount_minor")
        .eq("application_id", portal.application_id)
        .maybeSingle(),
    ]);
    if (paymentPlan.error || !paymentPlan.data)
      return error("Peşinat bilgisi doğrulanamadı.", 500);

    const path = `installment/${id}/${randomUUID()}.${validated.extension}`;
    const uploaded = await service.storage
      .from(RECEIPT_BUCKET)
      .upload(path, validated.buffer, {
        contentType: validated.storedMimeType,
        cacheControl: "0",
        upsert: false,
      });
    if (uploaded.error) return error("Dekont özel alana yüklenemedi.", 500);

    const saved = await service
      .from("installment_payment_receipts")
      .insert({
        portal_id: id,
        application_id: portal.application_id,
        payment_account_id: portal.payment_account_id,
        amount_minor: Number(paymentPlan.data.down_payment_amount_minor),
        storage_path: path,
        original_name: sanitizeOriginalFileName(file.name),
        mime_type: validated.storedMimeType,
        size_bytes: validated.sizeBytes,
        sha256: validated.sha256,
      })
      .select(
        "id,original_name,status,rejection_reason_public,uploaded_at,reviewed_at",
      )
      .single();
    if (saved.error) {
      await service.storage.from(RECEIPT_BUCKET).remove([path]);
      if (saved.error.code === "23505")
        return error("Dekontunuz zaten inceleniyor.", 409);
      return error("Dekont başvuruyla ilişkilendirilemedi.", 500);
    }

    const stage = await service
      .from("installment_customer_portals")
      .update({ stage: "payment_under_review" })
      .eq("id", id)
      .in("stage", ["down_payment_pending", "payment_under_review"]);
    if (stage.error) {
      await service
        .from("installment_payment_receipts")
        .delete()
        .eq("id", saved.data.id);
      await service.storage.from(RECEIPT_BUCKET).remove([path]);
      return error("Başvuru aşaması güncellenemedi.", 500);
    }
    await service.from("installment_application_events").insert({
      application_id: portal.application_id,
      event_type: "portal.receipt_uploaded",
      actor_type: "customer",
      metadata: {
        portal_id: id,
        receipt_id: saved.data.id,
        amount_minor: Number(paymentPlan.data.down_payment_amount_minor),
        mime_type: validated.storedMimeType,
        size_bytes: validated.sizeBytes,
      },
    });
    return NextResponse.json(
      { receipt: mapReceipt(saved.data) },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (caught) {
    if (caught instanceof InstallmentReceiptFileError)
      return error(caught.message, caught.status);
    return error("Dekont doğrulanamadı veya işlenemedi.", 422);
  }
}
