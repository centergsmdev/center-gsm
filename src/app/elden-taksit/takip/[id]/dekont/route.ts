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
    .is("superseded_at", null)
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
    const validated = await validateInstallmentReceipt(file);

    const path = `installment/${id}/${randomUUID()}.${validated.extension}`;
    const uploaded = await service.storage
      .from(RECEIPT_BUCKET)
      .upload(path, validated.buffer, {
        contentType: validated.storedMimeType,
        cacheControl: "0",
        upsert: false,
      });
    if (uploaded.error) return error("Dekont özel alana yüklenemedi.", 500);

    const replaced = await service.rpc("replace_installment_payment_receipt", {
      p_portal_id: id,
      p_storage_path: path,
      p_original_name: sanitizeOriginalFileName(file.name),
      p_mime_type: validated.storedMimeType,
      p_size_bytes: validated.sizeBytes,
      p_sha256: validated.sha256,
    });
    if (replaced.error || !replaced.data) {
      await service.storage.from(RECEIPT_BUCKET).remove([path]);
      if (replaced.error?.message.includes("receipt_upload_not_allowed"))
        return error("Bu başvuru aşamasında yeni dekont yüklenemez.", 409);
      return error("Dekont başvuruyla ilişkilendirilemedi.", 500);
    }

    const saved = await service
      .from("installment_payment_receipts")
      .select(
        "id,original_name,status,rejection_reason_public,uploaded_at,reviewed_at",
      )
      .eq("id", replaced.data)
      .is("superseded_at", null)
      .single();
    if (saved.error) {
      return error("Yeni dekont durumu yüklenemedi.", 500);
    }
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
