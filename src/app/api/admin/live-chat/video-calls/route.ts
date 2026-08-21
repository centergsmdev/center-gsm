import { NextResponse } from "next/server";

import {
  createParticipantToken,
  getIceServers,
  loadCallEvents,
  loadVideoSettings,
  parseCallRpcResult,
  toPublicVideoSettings,
  videoCallErrorMessage,
} from "@/lib/live-chat/video-server";
import { createServiceClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const error = (message: string, status = 400, code?: string) =>
  NextResponse.json({ error: message, code }, { status });

async function adminUser() {
  const auth = await createClient();
  if (!auth) return null;
  const result = await auth.auth.getUser();
  return result.data.user?.app_metadata.role === "admin"
    ? result.data.user
    : null;
}

export async function GET(request: Request) {
  const user = await adminUser();
  if (!user) return error("Bu işlem için yetkiniz yok.", 403);
  const service = createServiceClient();
  if (!service) return error("Görüntülü görüşme servisi kullanılamıyor.", 503);
  await service.rpc("expire_live_chat_calls");
  const calls = await service
    .from("live_chat_calls")
    .select("*")
    .in("status", [
      "ringing",
      "accepted",
      "connecting",
      "connected",
      "reconnecting",
    ])
    .order("requested_at", { ascending: true });
  if (calls.error) return error("Görüşme talepleri yüklenemedi.", 500);
  const conversationIds = [
    ...new Set(calls.data.map((call) => call.conversation_id)),
  ];
  const conversations = conversationIds.length
    ? await service
        .from("live_chat_conversations")
        .select("id,customer_name")
        .in("id", conversationIds)
    : { data: [], error: null };
  const names = new Map(
    (conversations.data ?? []).map((item) => [item.id, item.customer_name]),
  );
  const conversationId = new URL(request.url).searchParams.get(
    "conversationId",
  );
  const events = conversationId ? await loadCallEvents(conversationId) : [];
  return NextResponse.json({
    calls: calls.data.map((call) => ({
      ...call,
      customer_name: names.get(call.conversation_id) ?? "Müşteri",
    })),
    events,
  });
}

export async function PATCH(request: Request) {
  const user = await adminUser();
  if (!user) return error("Bu işlem için yetkiniz yok.", 403);
  let payload: {
    callId?: string;
    revision?: number;
    action?:
      | "accept"
      | "reject"
      | "connecting"
      | "connected"
      | "reconnecting"
      | "end"
      | "fail";
    reason?: string;
  };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return error("Geçersiz istek.");
  }
  if (
    !payload.callId ||
    !Number.isSafeInteger(payload.revision) ||
    !payload.action
  )
    return error("Geçersiz görüşme bilgisi.");
  const service = createServiceClient();
  if (!service) return error("Görüntülü görüşme servisi kullanılamıyor.", 503);
  const transitioned = await service.rpc("transition_live_chat_call", {
    p_call_id: payload.callId,
    p_expected_revision: payload.revision!,
    p_action: payload.action,
    p_actor_role: "admin",
    p_actor_id: user.id,
    p_reason: payload.reason?.slice(0, 120) ?? null,
  });
  if (transitioned.error) return error("Görüşme durumu güncellenemedi.", 500);
  const result = parseCallRpcResult(transitioned.data);
  if (!result.ok || !result.call)
    return error(videoCallErrorMessage(result.error), 409, result.error);
  const participant = [
    "accept",
    "connecting",
    "connected",
    "reconnecting",
  ].includes(payload.action)
    ? createParticipantToken({
        call: result.call,
        role: "admin",
        subject: user.id,
      })
    : null;
  const settings = await loadVideoSettings();
  return NextResponse.json({
    call: result.call,
    participant,
    iceServers: getIceServers(),
    settings: toPublicVideoSettings(settings),
  });
}
