import { randomUUID } from "node:crypto";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  InstallmentFileError,
  validateInstallmentFile,
} from "@/lib/installment/file-validation";
import {
  consumeInstallmentRateLimit,
  getDraftWithAccess,
  getInstallmentServiceClient,
  INSTALLMENT_STORAGE_BUCKET,
} from "@/lib/installment/server";
import {
  INSTALLMENT_DRAFT_COOKIE,
  sameOriginRequest,
  sanitizeOriginalFileName,
} from "@/lib/installment/server-security";
import {
  INSTALLMENT_DOCUMENT_TYPES,
  type InstallmentDocumentType,
} from "@/lib/installment/types";
import { isUuid } from "@/lib/installment/validation";

export const runtime = "nodejs";

const error = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; type: string }> },
) {
  if (!sameOriginRequest(request)) return error("Geçersiz istek kaynağı.", 403);
  const { id, type } = await params;
  if (
    !isUuid(id) ||
    !INSTALLMENT_DOCUMENT_TYPES.includes(type as InstallmentDocumentType)
  )
    return error("Belge hedefi geçersiz.");
  const documentType = type as InstallmentDocumentType;
  const service = getInstallmentServiceClient();
  if (!service) return error("Belge servisi kullanılamıyor.", 503);
  if (
    !(await consumeInstallmentRateLimit(service, request, "upload", 30, 3600))
  )
    return error(
      "Belge yükleme sınırı aşıldı. Lütfen daha sonra deneyin.",
      429,
    );

  const cookieStore = await cookies();
  const draft = await getDraftWithAccess(
    service,
    id,
    cookieStore.get(INSTALLMENT_DRAFT_COOKIE)?.value ?? null,
  );
  if (!draft) return error("Başvuru taslağına erişilemiyor.", 404);
  if (draft.status !== "draft")
    return error("Bu başvuru artık değiştirilemez.", 409);

  let file: File | null = null;
  try {
    const form = await request.formData();
    const entry = form.get("file");
    file = entry instanceof File ? entry : null;
  } catch {
    return error("Belge verisi okunamadı.");
  }
  if (!file) return error("Lütfen bir dosya seçin.");

  try {
    const validated = await validateInstallmentFile(file, documentType);
    const path = `${randomUUID()}/${randomUUID()}.${validated.extension}`;
    const existing = await service
      .from("installment_application_documents")
      .select("*")
      .eq("application_id", id)
      .eq("document_type", documentType)
      .maybeSingle();
    if (existing.error) return error("Belge kaydı kontrol edilemedi.", 500);

    const uploaded = await service.storage
      .from(INSTALLMENT_STORAGE_BUCKET)
      .upload(path, validated.buffer, {
        contentType: validated.storedMimeType,
        cacheControl: "0",
        upsert: false,
      });
    if (uploaded.error) return error("Belge güvenli alana yüklenemedi.", 500);

    const saved = await service
      .from("installment_application_documents")
      .upsert(
        {
          application_id: id,
          document_type: documentType,
          storage_path: path,
          original_name: sanitizeOriginalFileName(file.name),
          original_mime_type: file.type,
          stored_mime_type: validated.storedMimeType,
          size_bytes: validated.sizeBytes,
          sha256: validated.sha256,
          width: validated.width,
          height: validated.height,
        },
        { onConflict: "application_id,document_type" },
      );
    if (saved.error) {
      await service.storage.from(INSTALLMENT_STORAGE_BUCKET).remove([path]);
      return error("Belge başvuruyla ilişkilendirilemedi.", 500);
    }
    if (existing.data?.storage_path && existing.data.storage_path !== path)
      await service.storage
        .from(INSTALLMENT_STORAGE_BUCKET)
        .remove([existing.data.storage_path]);
    await service.from("installment_application_events").insert({
      application_id: id,
      event_type: "document.uploaded",
      actor_type: "customer",
      metadata: {
        document_type: documentType,
        mime_type: validated.storedMimeType,
        size_bytes: validated.sizeBytes,
      },
    });
    return NextResponse.json(
      {
        documentType,
        originalName: sanitizeOriginalFileName(file.name),
        sizeBytes: validated.sizeBytes,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (caught) {
    if (caught instanceof InstallmentFileError)
      return error(caught.message, caught.status);
    return error("Belge doğrulanamadı veya işlenemedi.", 422);
  }
}
