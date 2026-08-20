import { NextResponse } from "next/server";

import { getAdminContext } from "@/lib/installment/server";
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
  if (!isUuid(id)) return error("Sözleşme kimliği geçersiz.");
  const context = await getAdminContext();
  if (!context) return error("Admin yetkisi gerekiyor.", 403);
  const result = await context.service.rpc(
    "activate_installment_contract_template",
    { p_template_id: id, p_actor_user_id: context.user.id },
  );
  if (result.error) return error("Sözleşme versiyonu aktif edilemedi.", 409);
  return NextResponse.json(
    { template: result.data },
    { headers: { "Cache-Control": "no-store" } },
  );
}
