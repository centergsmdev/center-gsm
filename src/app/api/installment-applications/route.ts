import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  consumeInstallmentRateLimit,
  getInstallmentHashSecret,
  getInstallmentServiceClient,
  getOptionalSessionUser,
  resolveInstallmentProduct,
} from "@/lib/installment/server";
import {
  clientIpHash,
  createApplicationNumber,
  createDraftToken,
  hashText,
  INSTALLMENT_DRAFT_COOKIE,
  safeTokenMatch,
  sameOriginRequest,
  safeUserAgent,
} from "@/lib/installment/server-security";
import {
  isUuid,
  normalizeApplicantName,
  normalizeOptionalEmail,
  normalizeTurkishPhone,
} from "@/lib/installment/validation";

export const runtime = "nodejs";

const error = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status });

export async function POST(request: Request) {
  if (!sameOriginRequest(request)) return error("Geçersiz istek kaynağı.", 403);
  const service = getInstallmentServiceClient();
  const secret = getInstallmentHashSecret();
  if (!service || !secret)
    return error("Başvuru servisi şu anda kullanılamıyor.", 503);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return error("Başvuru bilgileri okunamadı.");
  }
  const productId = String(body.productId ?? "");
  const variantValue = String(body.variantId ?? "").trim();
  const variantId = variantValue || null;
  const idempotencyKey = String(body.idempotencyKey ?? "");
  const applicantName = normalizeApplicantName(
    String(body.applicantName ?? ""),
  );
  const phone = normalizeTurkishPhone(String(body.phone ?? ""));
  const email = normalizeOptionalEmail(String(body.email ?? ""));
  if (!isUuid(productId) || (variantId !== null && !isUuid(variantId)))
    return error("Ürün seçimi geçersiz.");
  if (!isUuid(idempotencyKey)) return error("Başvuru anahtarı geçersiz.");
  if (!applicantName) return error("Ad soyad alanını kontrol edin.");
  if (!phone) return error("Geçerli bir Türkiye cep telefonu girin.");
  if (email === undefined) return error("E-posta adresini kontrol edin.");

  const idempotencyHash = hashText(idempotencyKey);
  const cookieStore = await cookies();
  const existing = await service
    .from("installment_applications")
    .select("*")
    .eq("idempotency_key_hash", idempotencyHash)
    .maybeSingle();
  if (existing.data) {
    const token = cookieStore.get(INSTALLMENT_DRAFT_COOKIE)?.value ?? null;
    if (
      existing.data.status !== "draft" ||
      safeTokenMatch(existing.data.draft_token_hash, token)
    )
      return NextResponse.json(
        {
          applicationId: existing.data.id,
          applicationNumber: existing.data.application_number,
          status: existing.data.status,
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    return error("Bu başvuru anahtarı daha önce kullanılmış.", 409);
  }

  if (!(await consumeInstallmentRateLimit(service, request, "draft", 5, 3600)))
    return error(
      "Kısa sürede çok fazla başvuru denemesi yapıldı. Lütfen daha sonra tekrar deneyin.",
      429,
    );

  const resolved = await resolveInstallmentProduct(
    service,
    productId,
    variantId,
  );
  if (!resolved.data) return error(resolved.error);
  const [sessionUser, draftToken] = await Promise.all([
    getOptionalSessionUser(),
    Promise.resolve(createDraftToken()),
  ]);
  const summary = resolved.data;
  const inserted = await service
    .from("installment_applications")
    .insert({
      application_number: createApplicationNumber(),
      idempotency_key_hash: idempotencyHash,
      draft_token_hash: hashText(draftToken),
      user_id: sessionUser?.id ?? null,
      applicant_name: applicantName,
      phone_e164: phone,
      email,
      product_id: summary.productId,
      variant_id: summary.variantId,
      product_name_snapshot: summary.productName,
      variant_title_snapshot: summary.variantTitle,
      sku_snapshot: summary.sku,
      price_snapshot: summary.price,
      image_url_snapshot: summary.imageUrl,
      color_snapshot: summary.color,
      storage_value_snapshot: summary.storageValue,
      storage_unit_snapshot: summary.storageUnit,
      status: "draft",
      request_ip_hash: clientIpHash(request, secret),
      user_agent_summary: safeUserAgent(request),
    })
    .select("*")
    .single();
  if (inserted.error || !inserted.data)
    return error("Başvuru taslağı oluşturulamadı.", 500);

  const event = await service.from("installment_application_events").insert({
    application_id: inserted.data.id,
    event_type: "application.created",
    actor_type: "customer",
    metadata: {},
  });
  if (event.error) {
    await service
      .from("installment_applications")
      .delete()
      .eq("id", inserted.data.id)
      .eq("status", "draft");
    return error("Başvuru taslağı kaydedilemedi.", 500);
  }

  const response = NextResponse.json(
    {
      applicationId: inserted.data.id,
      applicationNumber: inserted.data.application_number,
      status: inserted.data.status,
    },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
  response.cookies.set(INSTALLMENT_DRAFT_COOKIE, draftToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 30 * 60,
    path: "/api/installment-applications",
  });
  return response;
}
