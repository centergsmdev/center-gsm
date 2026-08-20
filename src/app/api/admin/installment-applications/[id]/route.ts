import { NextResponse } from "next/server";

import { getAdminContext, mapAdminApplication } from "@/lib/installment/server";
import { isUuid } from "@/lib/installment/validation";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!isUuid(id))
    return NextResponse.json(
      { error: "Başvuru kimliği geçersiz." },
      { status: 400 },
    );
  const context = await getAdminContext();
  if (!context)
    return NextResponse.json(
      { error: "Admin yetkisi gerekiyor." },
      { status: 403 },
    );
  const [application, documents] = await Promise.all([
    context.service
      .from("installment_applications")
      .select("*")
      .eq("id", id)
      .neq("status", "draft")
      .maybeSingle(),
    context.service
      .from("installment_application_documents")
      .select(
        "id,application_id,document_type,original_name,stored_mime_type,size_bytes,created_at",
      )
      .eq("application_id", id)
      .order("created_at"),
  ]);
  if (application.error || documents.error)
    return NextResponse.json(
      { error: "Başvuru yüklenemedi." },
      { status: 500 },
    );
  if (!application.data)
    return NextResponse.json({ error: "Başvuru bulunamadı." }, { status: 404 });
  const row = application.data;
  return NextResponse.json(
    {
      item: {
        ...mapAdminApplication(row),
        decisionAt: row.decision_at,
        rejectionReasonPublic: row.rejection_reason_public,
        internalNote: row.internal_note,
        retentionReviewAt: row.retention_review_at,
        documents: documents.data.map((document) => ({
          id: document.id,
          type: document.document_type,
          originalName: document.original_name,
          mimeType: document.stored_mime_type,
          sizeBytes: document.size_bytes,
          createdAt: document.created_at,
        })),
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
