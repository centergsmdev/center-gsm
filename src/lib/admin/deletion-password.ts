import "server-only";

import { NextResponse } from "next/server";

import { verifyAdminDeletionPassword } from "@/lib/admin/deletion-password-core";
import type { createServiceClient } from "@/lib/supabase/admin";

type ServiceClient = NonNullable<ReturnType<typeof createServiceClient>>;

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

export async function requireAdminDeletionPassword(
  service: ServiceClient,
  password: unknown,
) {
  const value = typeof password === "string" ? password : "";
  const result = await service
    .from("admin_deletion_security")
    .select("password_hash,failed_attempts,locked_until")
    .eq("id", true)
    .maybeSingle();

  if (result.error || !result.data)
    return NextResponse.json(
      { error: "Silme şifresi henüz yapılandırılmamış." },
      { status: 503 },
    );

  const lockedUntil = result.data.locked_until
    ? new Date(result.data.locked_until)
    : null;
  if (lockedUntil && lockedUntil.getTime() > Date.now())
    return NextResponse.json(
      {
        error:
          "Çok fazla hatalı deneme yapıldı. Silme işlemleri 15 dakika kilitlendi.",
      },
      { status: 429 },
    );

  const valid = verifyAdminDeletionPassword(value, result.data.password_hash);
  if (!valid) {
    const failedAttempts = Math.min(
      MAX_ATTEMPTS,
      result.data.failed_attempts + 1,
    );
    const shouldLock = failedAttempts >= MAX_ATTEMPTS;
    await service
      .from("admin_deletion_security")
      .update({
        failed_attempts: shouldLock ? 0 : failedAttempts,
        locked_until: shouldLock
          ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString()
          : null,
      })
      .eq("id", true);
    return NextResponse.json(
      {
        error: shouldLock
          ? "Çok fazla hatalı deneme yapıldı. Silme işlemleri 15 dakika kilitlendi."
          : "Silme şifresi hatalı.",
      },
      { status: shouldLock ? 429 : 403 },
    );
  }

  if (result.data.failed_attempts || result.data.locked_until)
    await service
      .from("admin_deletion_security")
      .update({ failed_attempts: 0, locked_until: null })
      .eq("id", true);

  return null;
}
