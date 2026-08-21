import { NextResponse } from "next/server";

import {
  createVisitorChatClient,
  isLiveChatToken,
} from "@/lib/live-chat/server";
import {
  createParticipantToken,
  createRateKey,
  getIceServers,
  getVideoCallRuntimeConfig,
  isVideoCallEnvironmentEnabled,
  loadCallEvents,
  loadVideoSettings,
  parseCallRpcResult,
  requestAddress,
  toPublicVideoSettings,
  videoCallErrorMessage,
} from "@/lib/live-chat/video-server";
import { createServiceClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const error = (message: string, status = 400, code?: string) =>
  NextResponse.json({ error: message, code }, { status });

async function ownedConversation(token: string, conversationId: string) {
  const visitor = createVisitorChatClient(token);
  if (!visitor) return null;
  const result = await visitor
    .from("live_chat_conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("visitor_token", token)
    .maybeSingle();
  return result.data;
}

async function ownedCall(token: string, callId: string) {
  const service = createServiceClient();
  if (!service) return null;
  const result = await service
    .from("live_chat_calls")
    .select("*")
    .eq("id", callId)
    .maybeSingle();
  if (!result.data) return null;
  const conversation = await ownedConversation(
    token,
    result.data.conversation_id,
  );
  return conversation ? result.data : null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token")?.trim() ?? "";
  const callId = url.searchParams.get("callId")?.trim() ?? "";
  const settings = await loadVideoSettings();
  const publicSettings = toPublicVideoSettings(settings);

  if (!token || !callId)
    return NextResponse.json({
      settings: publicSettings,
      call: null,
      events: [],
    });
  if (!isLiveChatToken(token)) return error("Geçersiz sohbet anahtarı.");

  const service = createServiceClient();
  if (!service) return error("Görüntülü görüşme servisi kullanılamıyor.", 503);
  await service.rpc("expire_live_chat_calls");
  const call = await ownedCall(token, callId);
  if (!call) return error("Görüşme bulunamadı.", 404);
  const events = await loadCallEvents(call.conversation_id);
  return NextResponse.json({ settings: publicSettings, call, events });
}

export async function POST(request: Request) {
  let payload: { token?: string; conversationId?: string };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return error("Geçersiz istek.");
  }
  const token = payload.token?.trim() ?? "";
  const conversationId = payload.conversationId?.trim() ?? "";
  if (!isLiveChatToken(token) || !conversationId)
    return error("Geçersiz sohbet bilgisi.");
  if (!isVideoCallEnvironmentEnabled())
    return error("Görüntülü görüşme şu anda aktif değil.", 404);
  if (!process.env.SUPABASE_JWT_SECRET?.trim())
    return error("Görüntülü görüşme yetkilendirmesi yapılandırılmamış.", 503);

  const conversation = await ownedConversation(token, conversationId);
  if (!conversation)
    return error("Bu sohbet için görüşme başlatamazsınız.", 403);
  const service = createServiceClient();
  if (!service) return error("Görüntülü görüşme servisi kullanılamıyor.", 503);
  const settings = await loadVideoSettings();
  if (!settings.enabled)
    return error("Görüntülü görüşme şu anda aktif değil.", 404);
  const runtime = getVideoCallRuntimeConfig();
  const requested = await service.rpc("request_live_chat_call", {
    p_conversation_id: conversationId,
    p_rate_key_hash: createRateKey(token, requestAddress(request)),
    p_limit: runtime.requestLimit,
    p_window_seconds: runtime.rateWindowSeconds,
    p_ring_timeout_seconds: settings.ring_timeout_seconds,
    p_max_duration_seconds: settings.max_duration_seconds,
  });
  if (requested.error) return error("Görüşme talebi oluşturulamadı.", 500);
  const result = parseCallRpcResult(requested.data);
  if (!result.ok || !result.call)
    return error(videoCallErrorMessage(result.error), 409, result.error);
  const participant = createParticipantToken({
    call: result.call,
    role: "customer",
  });
  if (!participant)
    return error("Görüşme yetkilendirmesi oluşturulamadı.", 503);
  return NextResponse.json(
    {
      call: result.call,
      participant,
      iceServers: getIceServers(),
      settings: toPublicVideoSettings(settings),
    },
    { status: 201 },
  );
}

export async function PATCH(request: Request) {
  let payload: {
    token?: string;
    callId?: string;
    revision?: number;
    action?: "connecting" | "connected" | "reconnecting" | "end" | "fail";
    reason?: string;
  };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return error("Geçersiz istek.");
  }
  const token = payload.token?.trim() ?? "";
  const callId = payload.callId?.trim() ?? "";
  if (
    !isLiveChatToken(token) ||
    !callId ||
    !Number.isSafeInteger(payload.revision) ||
    !payload.action
  )
    return error("Geçersiz görüşme bilgisi.");
  const call = await ownedCall(token, callId);
  if (!call) return error("Görüşme bulunamadı.", 404);
  const service = createServiceClient();
  if (!service) return error("Görüntülü görüşme servisi kullanılamıyor.", 503);
  const transitioned = await service.rpc("transition_live_chat_call", {
    p_call_id: callId,
    p_expected_revision: payload.revision!,
    p_action: payload.action,
    p_actor_role: "customer",
    p_actor_id: null,
    p_reason: payload.reason?.slice(0, 120) ?? null,
  });
  if (transitioned.error) return error("Görüşme durumu güncellenemedi.", 500);
  const result = parseCallRpcResult(transitioned.data);
  if (!result.ok || !result.call)
    return error(videoCallErrorMessage(result.error), 409, result.error);
  const participant = createParticipantToken({
    call: result.call,
    role: "customer",
  });
  return NextResponse.json({ call: result.call, participant });
}
