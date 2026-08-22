import { createHash, randomUUID } from "node:crypto";

import { createServiceClient } from "@/lib/supabase/admin";
import { signCallParticipantJwt } from "@/lib/live-chat/video-token";
import { trustedClientAddress } from "@/lib/live-chat/abuse";
import type {
  LiveChatCall,
  LiveChatCallEvent,
  LiveChatVideoSettings,
} from "@/types/database";

export type PublicVideoSettings = Pick<
  LiveChatVideoSettings,
  | "avatar_mode"
  | "avatar_display_name"
  | "avatar_image_url"
  | "ring_timeout_seconds"
  | "max_duration_seconds"
> & {
  enabled: boolean;
};

export type CallRpcResult = {
  ok: boolean;
  error?: string;
  call?: LiveChatCall;
};

export const DEFAULT_VIDEO_SETTINGS: LiveChatVideoSettings = {
  id: true,
  enabled: false,
  avatar_mode: "audio-reactive",
  avatar_display_name: "CENTER GSM Dijital Temsilci",
  avatar_image_url: null,
  avatar_image_path: null,
  ring_timeout_seconds: 30,
  max_duration_seconds: 1200,
  updated_at: "",
  updated_by: null,
};

function boundedInteger(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= min && parsed <= max
    ? parsed
    : fallback;
}

export function isVideoCallEnvironmentEnabled() {
  return process.env.VIDEO_CALLS_ENABLED?.trim().toLowerCase() === "true";
}

export function getVideoCallRuntimeConfig() {
  return {
    ringTimeoutSeconds: boundedInteger(
      process.env.VIDEO_CALL_RING_TIMEOUT_SECONDS,
      30,
      15,
      120,
    ),
    maxDurationSeconds: boundedInteger(
      process.env.VIDEO_CALL_MAX_DURATION_SECONDS,
      1200,
      60,
      3600,
    ),
    requestLimit: boundedInteger(
      process.env.VIDEO_CALL_REQUEST_LIMIT,
      3,
      1,
      20,
    ),
    rateWindowSeconds: boundedInteger(
      process.env.VIDEO_CALL_RATE_WINDOW_SECONDS,
      600,
      30,
      86400,
    ),
  };
}

export function getIceServers(): RTCIceServer[] {
  const urls = (process.env.VIDEO_CALL_STUN_URLS ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.startsWith("stun:"));
  return urls.length ? [{ urls }] : [];
}

export async function loadVideoSettings() {
  const service = createServiceClient();
  if (!service) return DEFAULT_VIDEO_SETTINGS;
  const result = await service
    .from("live_chat_video_settings")
    .select("*")
    .eq("id", true)
    .maybeSingle();
  return result.data ?? DEFAULT_VIDEO_SETTINGS;
}

export function toPublicVideoSettings(
  settings: LiveChatVideoSettings,
): PublicVideoSettings {
  return {
    enabled: isVideoCallEnvironmentEnabled() && settings.enabled,
    avatar_mode: settings.avatar_mode,
    avatar_display_name: settings.avatar_display_name,
    avatar_image_url: settings.avatar_image_url,
    ring_timeout_seconds: settings.ring_timeout_seconds,
    max_duration_seconds: settings.max_duration_seconds,
  };
}

export function createRateKey(visitorToken: string, address: string) {
  return createHash("sha256")
    .update(`${visitorToken}:${address.slice(0, 80)}`)
    .digest("hex");
}

export function requestAddress(request: Request) {
  return trustedClientAddress(request) ?? "unknown";
}

export function createParticipantToken(input: {
  call: LiveChatCall;
  role: "customer" | "admin";
  subject?: string;
}) {
  const secret = process.env.SUPABASE_JWT_SECRET?.trim();
  if (!secret) return null;
  const now = Math.floor(Date.now() / 1000);
  const databaseExpiry = Math.floor(
    new Date(input.call.auth_expires_at).getTime() / 1000,
  );
  const expiry = Math.max(now + 60, Math.min(databaseExpiry, now + 3900));
  return {
    token: signCallParticipantJwt({
      secret,
      subject: input.subject ?? randomUUID(),
      callId: input.call.id,
      callNonce: input.call.signaling_nonce,
      callRole: input.role,
      issuedAt: now,
      expiresAt: expiry,
    }),
    expiresAt: expiry * 1000,
  };
}

export function parseCallRpcResult(value: unknown): CallRpcResult {
  if (!value || typeof value !== "object")
    return { ok: false, error: "invalid_response" };
  const result = value as Partial<CallRpcResult>;
  return {
    ok: result.ok === true,
    error: typeof result.error === "string" ? result.error : undefined,
    call: result.call as LiveChatCall | undefined,
  };
}

export async function loadCallEvents(conversationId: string) {
  const service = createServiceClient();
  if (!service) return [] as LiveChatCallEvent[];
  const result = await service
    .from("live_chat_call_events")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  return result.data ?? [];
}

export async function loadCallHistory(conversationId: string) {
  const service = createServiceClient();
  if (!service) return [] as LiveChatCall[];
  const result = await service
    .from("live_chat_calls")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("requested_at", { ascending: true });
  return result.data ?? [];
}

export async function notifyCallTimeline(conversationId: string) {
  const service = createServiceClient();
  if (!service) return;
  let channel: ReturnType<typeof service.channel> | null = null;
  try {
    const conversation = await service
      .from("live_chat_conversations")
      .select("visitor_token")
      .eq("id", conversationId)
      .maybeSingle();
    if (!conversation.data?.visitor_token) return;
    channel = service.channel(`live-chat:${conversation.data.visitor_token}`);
    await channel.httpSend("call_timeline", { conversationId });
  } catch {
    // Timeline refresh is best-effort and must never interrupt a call transition.
  } finally {
    if (channel) await service.removeChannel(channel).catch(() => undefined);
  }
}

export const VIDEO_CALL_ERROR_MESSAGES: Record<string, string> = {
  active_call_exists: "Bu sohbet için zaten aktif bir görüşme talebi var.",
  rate_limited:
    "Çok fazla görüşme talebi gönderdiniz. Lütfen daha sonra tekrar deneyin.",
  call_already_taken: "Bu görüşme talebi başka bir yönetici tarafından alındı.",
  admin_busy: "Müşteri temsilcimiz şu anda başka bir görüşmede.",
  call_expired: "Görüşme talebinin süresi doldu.",
  stale_revision: "Görüşme durumu değişti. Lütfen ekranı yenileyin.",
  invalid_transition: "Bu görüşme işlemi artık gerçekleştirilemiyor.",
};

export function videoCallErrorMessage(code?: string) {
  return (
    VIDEO_CALL_ERROR_MESSAGES[code ?? ""] ??
    "Görüntülü görüşme işlemi tamamlanamadı."
  );
}
