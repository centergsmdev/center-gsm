import { NextResponse } from "next/server";

import {
  enforceLiveChatRateLimit,
  resolveLiveChatBlock,
  resolveLiveChatIdentity,
} from "@/lib/live-chat/abuse";
import { LIVE_CHAT_BLOCKED_MESSAGE } from "@/lib/live-chat/abuse-shared";
import {
  createVisitorChatClient,
  isLiveChatToken,
} from "@/lib/live-chat/server";
import {
  isSimliCallStatus,
  isUuid,
  SIMLI_AUDIO_STRATEGY,
  SIMLI_AVATAR_MODE,
  SIMLI_TRANSPORT,
} from "@/lib/live-chat/simli";
import {
  createSimliSessionToken,
  getSimliServerConfig,
} from "@/lib/live-chat/simli-server";
import { loadVideoSettings } from "@/lib/live-chat/video-server";
import { createServiceClient } from "@/lib/supabase/admin";
import type { LiveChatCall } from "@/types/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LEASE_SECONDS = 45;

const error = (message: string, status = 400, code?: string) =>
  NextResponse.json({ error: message, code }, { status });

async function ownedCall(token: string, callId: string) {
  const visitor = createVisitorChatClient(token);
  const service = createServiceClient();
  if (!visitor || !service) return null;
  const callResult = await service
    .from("live_chat_calls")
    .select("*")
    .eq("id", callId)
    .maybeSingle();
  const call = callResult.data as LiveChatCall | null;
  if (!call) return null;
  const conversation = await visitor
    .from("live_chat_conversations")
    .select("id")
    .eq("id", call.conversation_id)
    .eq("visitor_token", token)
    .maybeSingle();
  return conversation.data ? call : null;
}

async function authorizeRequest(input: { token: string; callId: string }) {
  if (!isLiveChatToken(input.token) || !isUuid(input.callId)) return null;
  const call = await ownedCall(input.token, input.callId);
  if (!call) return null;
  const service = createServiceClient();
  if (!service) return null;
  return { call, service };
}

export async function POST(request: Request) {
  let payload: { token?: string; callId?: string; attemptId?: string };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return error("Geçersiz Simli oturum isteği.");
  }
  const token = payload.token?.trim() ?? "";
  const callId = payload.callId?.trim() ?? "";
  const attemptId = payload.attemptId?.trim() ?? "";
  if (!isUuid(attemptId)) return error("Geçersiz Simli deneme kimliği.");
  const authorized = await authorizeRequest({ token, callId });
  if (!authorized)
    return error("Bu görüşme için avatar oturumu başlatamazsınız.", 403);
  if (!isSimliCallStatus(authorized.call.status))
    return error("Görüşme henüz kabul edilmedi.", 409, "call_not_active");
  const config = getSimliServerConfig();
  const settings = await loadVideoSettings();
  if (
    !config.configured ||
    !settings.enabled ||
    settings.avatar_mode !== SIMLI_AVATAR_MODE
  )
    return error(
      "Simli Trinity şu anda yapılandırılmamış.",
      503,
      "simli_not_configured",
    );

  const identity = await resolveLiveChatIdentity(request, token);
  if ((await resolveLiveChatBlock(authorized.service, identity)).blocked)
    return error(LIVE_CHAT_BLOCKED_MESSAGE, 403, "LIVE_CHAT_BLOCKED");
  // Session creation consumes the existing video-call quota as a second,
  // stricter gate. It does not create a new public rate-limit surface.
  const rateLimit = await enforceLiveChatRateLimit(
    authorized.service,
    "video_request",
    identity,
  );
  if (!rateLimit.allowed)
    return NextResponse.json(
      {
        error: "Avatar oturumu için çok fazla deneme yapıldı.",
        code: "rate_limited",
      },
      {
        status: 429,
        headers: { "Retry-After": String(Math.max(1, rateLimit.retryAfter)) },
      },
    );

  const reserved = await authorized.service.rpc(
    "reserve_live_chat_simli_session",
    {
      p_call_id: callId,
      p_attempt_id: attemptId,
      p_lease_seconds: LEASE_SECONDS,
    },
  );
  const reservation = reserved.data as {
    ok?: boolean;
    error?: string;
    reused?: boolean;
  } | null;
  if (reserved.error)
    return error("Avatar oturumu ayrılamadı.", 503, "reservation_failed");
  if (!reservation?.ok || reservation.reused)
    return error(
      "Bu görüşme için zaten aktif bir avatar oturumu var.",
      409,
      reservation?.error ?? "session_already_active",
    );

  try {
    const sessionToken = await createSimliSessionToken({
      maxDurationSeconds: settings.max_duration_seconds,
    });
    if (request.signal.aborted) {
      await authorized.service.rpc("release_live_chat_simli_session", {
        p_call_id: callId,
        p_attempt_id: attemptId,
        p_failed: false,
      });
      return new NextResponse(null, { status: 499 });
    }
    return NextResponse.json({
      sessionToken,
      attemptId,
      transport: SIMLI_TRANSPORT,
      audioStrategy: SIMLI_AUDIO_STRATEGY,
      leaseSeconds: LEASE_SECONDS,
    });
  } catch {
    await authorized.service.rpc("release_live_chat_simli_session", {
      p_call_id: callId,
      p_attempt_id: attemptId,
      p_failed: true,
    });
    return error(
      "Dijital temsilci hazırlanamadı; sesli görüşme devam ediyor.",
      502,
      "simli_unavailable",
    );
  }
}

export async function PATCH(request: Request) {
  let payload: { token?: string; callId?: string; attemptId?: string };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return error("Geçersiz Simli oturum isteği.");
  }
  const token = payload.token?.trim() ?? "";
  const callId = payload.callId?.trim() ?? "";
  const attemptId = payload.attemptId?.trim() ?? "";
  if (!isUuid(attemptId)) return error("Geçersiz Simli deneme kimliği.");
  const authorized = await authorizeRequest({ token, callId });
  if (!authorized)
    return error("Bu görüşme için avatar oturumunu yenileyemezsiniz.", 403);
  if (!isSimliCallStatus(authorized.call.status))
    return error("Görüşme artık aktif değil.", 409, "call_not_active");
  const touched = await authorized.service.rpc(
    "touch_live_chat_simli_session",
    {
      p_call_id: callId,
      p_attempt_id: attemptId,
      p_lease_seconds: LEASE_SECONDS,
    },
  );
  const result = touched.data as { ok?: boolean; error?: string } | null;
  if (touched.error || !result?.ok)
    return error("Avatar oturumu yenilenemedi.", 409, result?.error);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  let payload: {
    token?: string;
    callId?: string;
    attemptId?: string;
    failed?: boolean;
  };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return error("Geçersiz Simli oturum isteği.");
  }
  const token = payload.token?.trim() ?? "";
  const callId = payload.callId?.trim() ?? "";
  const attemptId = payload.attemptId?.trim() ?? "";
  if (!isUuid(attemptId)) return error("Geçersiz Simli deneme kimliği.");
  const authorized = await authorizeRequest({ token, callId });
  if (!authorized)
    return error("Bu görüşme için avatar oturumunu kapatamazsınız.", 403);
  await authorized.service.rpc("release_live_chat_simli_session", {
    p_call_id: callId,
    p_attempt_id: attemptId,
    p_failed: payload.failed === true,
  });
  return NextResponse.json({ ok: true });
}
