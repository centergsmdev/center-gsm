import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin/require-admin";
import { requireAdminDeletionPassword } from "@/lib/admin/deletion-password";
import { isUuid } from "@/lib/installment/validation";

export const runtime = "nodejs";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ customerId: string }> },
) {
  const { customerId } = await params;
  if (!isUuid(customerId))
    return NextResponse.json(
      { error: "Müşteri kimliği geçersiz." },
      { status: 400 },
    );

  const admin = await requireAdmin(request);
  if (admin.error) return admin.error;

  let body: { password?: unknown };
  try {
    body = (await request.json()) as { password?: unknown };
  } catch {
    return NextResponse.json(
      { error: "Silme şifresi okunamadı." },
      { status: 400 },
    );
  }
  const passwordError = await requireAdminDeletionPassword(
    admin.service,
    body.password,
  );
  if (passwordError) return passwordError;

  const profile = await admin.service
    .from("customer_profiles")
    .select("id,user_id,email")
    .eq("id", customerId)
    .maybeSingle();
  if (profile.error)
    return NextResponse.json(
      { error: "Müşteri kaydı okunamadı." },
      { status: 500 },
    );
  if (!profile.data)
    return NextResponse.json(
      { error: "Müşteri kaydı bulunamadı." },
      { status: 404 },
    );
  if (profile.data.user_id === admin.user.id)
    return NextResponse.json(
      { error: "Kendi yönetici hesabınızı silemezsiniz." },
      { status: 409 },
    );

  const authUser = await admin.service.auth.admin.getUserById(
    profile.data.user_id,
  );
  if (authUser.error || !authUser.data.user)
    return NextResponse.json(
      { error: "Müşteri hesabı bulunamadı." },
      { status: 404 },
    );
  if (authUser.data.user.app_metadata.role === "admin")
    return NextResponse.json(
      { error: "Yönetici hesapları müşteri listesinden silinemez." },
      { status: 409 },
    );

  // Soft deletion disables and anonymizes the login without breaking retained
  // orders, payments or other legally relevant business records.
  const disabled = await admin.service.auth.admin.deleteUser(
    profile.data.user_id,
    true,
  );
  if (disabled.error)
    return NextResponse.json(
      { error: "Müşteri hesabı kapatılamadı." },
      { status: 500 },
    );

  const [customerCleanup, publicProfileCleanup] = await Promise.all([
    admin.service.from("customer_profiles").delete().eq("id", customerId),
    admin.service.from("profiles").delete().eq("id", profile.data.user_id),
  ]);
  if (customerCleanup.error || publicProfileCleanup.error)
    return NextResponse.json(
      {
        error:
          "Müşteri hesabı kapatıldı ancak liste kaydı temizlenemedi. Sayfayı yenileyip tekrar deneyin.",
      },
      { status: 500 },
    );

  return NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}
