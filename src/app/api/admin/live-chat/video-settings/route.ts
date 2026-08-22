import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { PRODUCT_IMAGE_BUCKET } from "@/lib/admin/product-images";
import { processProductImage } from "@/lib/images/product-image-pipeline";
import {
  isVideoCallEnvironmentEnabled,
  loadVideoSettings,
} from "@/lib/live-chat/video-server";
import { publicSimliConfig } from "@/lib/live-chat/simli-server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

const error = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status });

async function adminClient() {
  const client = await createClient();
  if (!client) return null;
  const auth = await client.auth.getUser();
  return auth.data.user?.app_metadata.role === "admin"
    ? { client, user: auth.data.user }
    : null;
}

export async function GET() {
  const admin = await adminClient();
  if (!admin) return error("Bu işlem için yetkiniz yok.", 403);
  return NextResponse.json({
    settings: await loadVideoSettings(),
    environmentEnabled: isVideoCallEnvironmentEnabled(),
    participantAuthConfigured: Boolean(process.env.SUPABASE_JWT_SECRET?.trim()),
    ...publicSimliConfig(),
  });
}

export async function PATCH(request: Request) {
  const admin = await adminClient();
  if (!admin) return error("Bu işlem için yetkiniz yok.", 403);
  let payload: {
    enabled?: boolean;
    avatarMode?: "static" | "audio-reactive" | "simli-trinity";
    avatarDisplayName?: string;
    ringTimeoutSeconds?: number;
    maxDurationSeconds?: number;
  };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return error("Geçersiz ayar isteği.");
  }
  const displayName = payload.avatarDisplayName?.trim();
  if (!displayName || displayName.length < 2 || displayName.length > 80)
    return error("Avatar görünen adı 2–80 karakter olmalıdır.");
  if (
    !payload.avatarMode ||
    !["static", "audio-reactive", "simli-trinity"].includes(payload.avatarMode)
  )
    return error("Geçersiz avatar modu.");
  if (
    payload.avatarMode === "simli-trinity" &&
    !publicSimliConfig().simliConfigured
  )
    return error(
      "Simli Trinity için server-only ortam ayarları henüz hazır değil.",
      409,
    );
  if (
    !Number.isSafeInteger(payload.ringTimeoutSeconds) ||
    Number(payload.ringTimeoutSeconds) < 15 ||
    Number(payload.ringTimeoutSeconds) > 120
  )
    return error("Çağrı bekleme süresi 15–120 saniye olmalıdır.");
  if (
    !Number.isSafeInteger(payload.maxDurationSeconds) ||
    Number(payload.maxDurationSeconds) < 60 ||
    Number(payload.maxDurationSeconds) > 3600
  )
    return error("Maksimum görüşme süresi 60–3600 saniye olmalıdır.");

  const updated = await admin.client
    .from("live_chat_video_settings")
    .update({
      enabled: payload.enabled === true,
      avatar_mode: payload.avatarMode,
      avatar_display_name: displayName,
      ring_timeout_seconds: payload.ringTimeoutSeconds!,
      max_duration_seconds: payload.maxDurationSeconds!,
      updated_at: new Date().toISOString(),
      updated_by: admin.user.id,
    })
    .eq("id", true)
    .select("*")
    .single();
  if (updated.error)
    return error("Görüntülü görüşme ayarları kaydedilemedi.", 500);
  return NextResponse.json({ settings: updated.data });
}

export async function POST(request: Request) {
  const admin = await adminClient();
  if (!admin) return error("Bu işlem için yetkiniz yok.", 403);
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return error("Avatar yükleme verisi okunamadı.");
  }
  const file = formData.get("avatar");
  if (!(file instanceof File)) return error("Avatar görseli seçilmedi.");
  if (!ACCEPTED_TYPES.has(file.type))
    return error(
      "Sadece JPEG, PNG veya WebP avatar görseli yükleyebilirsiniz.",
    );
  if (file.size > MAX_AVATAR_SIZE)
    return error("Avatar görseli 5 MB sınırını aşıyor.");

  const current = await loadVideoSettings();
  const path = `live-chat-avatar/${randomUUID()}.webp`;
  try {
    const processed = await processProductImage(
      Buffer.from(await file.arrayBuffer()),
    );
    const uploaded = await admin.client.storage
      .from(PRODUCT_IMAGE_BUCKET)
      .upload(path, processed.buffer, {
        contentType: "image/webp",
        cacheControl: "31536000",
        upsert: false,
      });
    if (uploaded.error) throw uploaded.error;
    const publicUrl = admin.client.storage
      .from(PRODUCT_IMAGE_BUCKET)
      .getPublicUrl(path).data.publicUrl;
    const saved = await admin.client
      .from("live_chat_video_settings")
      .update({
        avatar_image_path: path,
        avatar_image_url: publicUrl,
        updated_at: new Date().toISOString(),
        updated_by: admin.user.id,
      })
      .eq("id", true)
      .select("*")
      .single();
    if (saved.error) {
      await admin.client.storage.from(PRODUCT_IMAGE_BUCKET).remove([path]);
      throw saved.error;
    }
    if (
      current.avatar_image_path?.startsWith("live-chat-avatar/") &&
      current.avatar_image_path !== path
    )
      await admin.client.storage
        .from(PRODUCT_IMAGE_BUCKET)
        .remove([current.avatar_image_path]);
    return NextResponse.json({ settings: saved.data });
  } catch {
    return error("Avatar görseli işlenemedi veya yüklenemedi.", 422);
  }
}
