import { NextResponse } from "next/server";

import {
  sanitizeInstallmentContractContent,
  validateInstallmentContractTemplate,
} from "@/lib/installment/contract-server";
import { getAdminContext } from "@/lib/installment/server";
import { sameOriginRequest } from "@/lib/installment/server-security";

export const runtime = "nodejs";

const error = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status });

export async function GET() {
  const context = await getAdminContext();
  if (!context) return error("Admin yetkisi gerekiyor.", 403);
  const result = await context.service
    .from("installment_contract_templates")
    .select("*")
    .order("created_at", { ascending: false });
  if (result.error) return error("Sözleşmeler yüklenemedi.", 500);
  return NextResponse.json(
    {
      templates: result.data.map((row) => ({
        id: row.id,
        title: row.title,
        version: row.version,
        contentHtml: sanitizeInstallmentContractContent(row.content_html),
        contentHash: row.content_sha256,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  if (!sameOriginRequest(request)) return error("Geçersiz istek kaynağı.", 403);
  const context = await getAdminContext();
  if (!context) return error("Admin yetkisi gerekiyor.", 403);
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return error("Sözleşme bilgileri okunamadı.");
  }
  const validated = validateInstallmentContractTemplate({
    title: String(body.title ?? ""),
    version: String(body.version ?? ""),
    contentHtml: String(body.contentHtml ?? ""),
  });
  if (!validated.data) return error(validated.error);
  const result = await context.service
    .from("installment_contract_templates")
    .insert({
      title: validated.data.title,
      version: validated.data.version,
      content_html: validated.data.contentHtml,
      is_active: false,
      created_by: context.user.id,
    })
    .select("*")
    .single();
  if (result.error) {
    if (result.error.code === "23505")
      return error("Bu sözleşme versiyonu zaten mevcut.", 409);
    return error("Yeni sözleşme versiyonu oluşturulamadı.", 500);
  }
  return NextResponse.json(
    {
      template: {
        id: result.data.id,
        title: result.data.title,
        version: result.data.version,
        contentHtml: sanitizeInstallmentContractContent(
          result.data.content_html,
        ),
        contentHash: result.data.content_sha256,
        isActive: result.data.is_active,
        createdAt: result.data.created_at,
        updatedAt: result.data.updated_at,
      },
    },
    { status: 201 },
  );
}
