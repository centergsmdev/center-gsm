import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  consumeInstallmentRateLimit,
  getDraftWithAccess,
  getInstallmentServiceClient,
  resolveInstallmentProduct,
} from "@/lib/installment/server";
import {
  hashText,
  INSTALLMENT_DRAFT_COOKIE,
  sameOriginRequest,
} from "@/lib/installment/server-security";
import { isUuid } from "@/lib/installment/validation";

export const runtime = "nodejs";

const PRIVACY_NOTICE_VERSION = "kvkk-application-2026-08-20";
const TERMS_VERSION = "installment-application-2026-08-20";
const error = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!sameOriginRequest(request)) return error("Geçersiz istek kaynağı.", 403);
  const { id } = await params;
  if (!isUuid(id)) return error("Başvuru kimliği geçersiz.");
  const service = getInstallmentServiceClient();
  if (!service) return error("Başvuru servisi kullanılamıyor.", 503);
  if (!(await consumeInstallmentRateLimit(service, request, "submit", 5, 3600)))
    return error(
      "Başvuru gönderim sınırı aşıldı. Lütfen daha sonra deneyin.",
      429,
    );

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return error("Onay bilgileri okunamadı.");
  }
  if (
    body.privacyNoticeAcknowledged !== true ||
    body.applicationTermsAcknowledged !== true
  )
    return error("Zorunlu bilgilendirmeleri tamamlayın.");

  const cookieStore = await cookies();
  const token = cookieStore.get(INSTALLMENT_DRAFT_COOKIE)?.value ?? null;
  const draft = await getDraftWithAccess(service, id, token);
  if (!draft || !token) return error("Başvuru taslağına erişilemiyor.", 404);
  const resolved = await resolveInstallmentProduct(
    service,
    draft.product_id,
    draft.variant_id,
  );
  if (!resolved.data) return error(resolved.error, 409);

  const result = await service.rpc("submit_installment_application", {
    p_application_id: id,
    p_draft_token_hash: hashText(token),
    p_privacy_notice_version: PRIVACY_NOTICE_VERSION,
    p_terms_version: TERMS_VERSION,
  });
  if (result.error || !result.data || typeof result.data !== "object") {
    const message = result.error?.message ?? "";
    if (message.includes("documents_incomplete"))
      return error("Zorunlu belgeler veya imza eksik.");
    if (
      message.includes("inactive_product") ||
      message.includes("invalid_variant")
    )
      return error("Ürün veya varyant artık başvuruya açık değil.", 409);
    return error("Başvuru gönderilemedi.", 500);
  }
  const payload = result.data as Record<string, unknown>;
  const response = NextResponse.json(
    {
      applicationId: id,
      applicationNumber: String(payload.application_number ?? ""),
      status: String(payload.status ?? "submitted"),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
  response.cookies.set(INSTALLMENT_DRAFT_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    expires: new Date(0),
    path: "/api/installment-applications",
  });
  return response;
}
