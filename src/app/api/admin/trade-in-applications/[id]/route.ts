import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin/require-admin";
import {
  TRADE_IN_BUCKET,
  TRADE_IN_STATUS_LABELS,
} from "@/lib/trade-in/constants";
import type { TradeInStatus } from "@/types/database";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;
  const { id } = await context.params;
  const [application, photos] = await Promise.all([
    admin.service
      .from("trade_in_applications")
      .select("*")
      .eq("id", id)
      .maybeSingle(),
    admin.service
      .from("trade_in_photos")
      .select("*")
      .eq("application_id", id)
      .order("sort_order"),
  ]);
  if (application.error || !application.data)
    return NextResponse.json(
      { data: null, error: "Başvuru bulunamadı." },
      { status: 404 },
    );
  if (photos.error)
    return NextResponse.json(
      { data: null, error: "Fotoğraflar yüklenemedi." },
      { status: 500 },
    );

  const signedPhotos = await Promise.all(
    photos.data.map(async (photo) => {
      const signed = await admin.service.storage
        .from(TRADE_IN_BUCKET)
        .createSignedUrl(photo.storage_path, 600);
      return { ...photo, url: signed.data?.signedUrl ?? null };
    }),
  );
  return NextResponse.json({
    data: { application: application.data, photos: signedPhotos },
    error: null,
  });
}

export async function PATCH(request: Request, context: Context) {
  const admin = await requireAdmin(request);
  if (admin.error) return admin.error;
  const { id } = await context.params;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bilgiler okunamadı." }, { status: 400 });
  }

  const status = String(body.status ?? "") as TradeInStatus;
  if (!(status in TRADE_IN_STATUS_LABELS))
    return NextResponse.json(
      { error: "Geçersiz başvuru durumu." },
      { status: 400 },
    );
  const offerAmountMinor =
    body.offerAmountMinor === null || body.offerAmountMinor === ""
      ? null
      : Number(body.offerAmountMinor);
  if (
    offerAmountMinor !== null &&
    (!Number.isSafeInteger(offerAmountMinor) || offerAmountMinor < 0)
  )
    return NextResponse.json(
      { error: "Teklif tutarı geçersiz." },
      { status: 400 },
    );
  if (
    ["offer_sent", "accepted", "completed"].includes(status) &&
    (!offerAmountMinor || offerAmountMinor < 1)
  )
    return NextResponse.json(
      { error: "Bu durum için geçerli bir teklif tutarı girmelisiniz." },
      { status: 400 },
    );
  const customerResponseNote =
    String(body.customerResponseNote ?? "")
      .trim()
      .slice(0, 1000) || null;
  const internalNote =
    String(body.internalNote ?? "")
      .trim()
      .slice(0, 2000) || null;
  const result = await admin.service
    .from("trade_in_applications")
    .update({
      status,
      offer_amount_minor: offerAmountMinor,
      customer_response_note: customerResponseNote,
      internal_note: internalNote,
      reviewed_at: new Date().toISOString(),
      reviewed_by: admin.user.id,
    })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (result.error || !result.data)
    return NextResponse.json(
      { error: "Başvuru güncellenemedi." },
      { status: 422 },
    );
  return NextResponse.json({ data: result.data, error: null });
}
