import { NextResponse } from "next/server";

import {
  getAdminContext,
  INSTALLMENT_STORAGE_BUCKET,
} from "@/lib/installment/server";
import { isUuid } from "@/lib/installment/validation";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; documentId: string }> },
) {
  const { id, documentId } = await params;
  if (!isUuid(id) || !isUuid(documentId))
    return NextResponse.json(
      { error: "Belge kimliği geçersiz." },
      { status: 400 },
    );
  const context = await getAdminContext();
  if (!context)
    return NextResponse.json(
      { error: "Admin yetkisi gerekiyor." },
      { status: 403 },
    );
  const document = await context.service
    .from("installment_application_documents")
    .select("*")
    .eq("id", documentId)
    .eq("application_id", id)
    .maybeSingle();
  if (document.error || !document.data)
    return NextResponse.json({ error: "Belge bulunamadı." }, { status: 404 });

  const downloaded = await context.service.storage
    .from(INSTALLMENT_STORAGE_BUCKET)
    .download(document.data.storage_path);
  if (downloaded.error || !downloaded.data)
    return NextResponse.json({ error: "Belge yüklenemedi." }, { status: 500 });

  const url = new URL(request.url);
  const download = url.searchParams.get("download") === "1";
  const eventType = download ? "document.downloaded" : "document.viewed";
  await Promise.all([
    context.service.from("installment_application_events").insert({
      application_id: id,
      event_type: eventType,
      actor_type: "admin",
      actor_user_id: context.user.id,
      metadata: { document_type: document.data.document_type },
    }),
    context.session.rpc("write_audit_log", {
      p_action: eventType,
      p_entity_type: "installment_application",
      p_entity_id: id,
      p_entity_name: document.data.document_type,
      p_old_data: null,
      p_new_data: null,
      p_metadata: { document_type: document.data.document_type },
    }),
  ]);

  const safeName = document.data.original_name
    .normalize("NFKD")
    .replace(/[^\x20-\x7e]/g, "_")
    .replace(/["\\\r\n]/g, "_")
    .slice(0, 120);
  return new NextResponse(await downloaded.data.arrayBuffer(), {
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Type": document.data.stored_mime_type,
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${safeName}"`,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
