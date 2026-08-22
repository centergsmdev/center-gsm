import { NextResponse } from "next/server";

import {
  createVisitorChatClient,
  isLiveChatToken,
} from "@/lib/live-chat/server";
import {
  enforceLiveChatRateLimit,
  observeLiveChatIdentity,
  resolveLiveChatBlock,
  resolveLiveChatIdentity,
} from "@/lib/live-chat/abuse";
import { LIVE_CHAT_BLOCKED_MESSAGE } from "@/lib/live-chat/abuse-shared";
import { createServiceClient } from "@/lib/supabase/admin";
import type { LiveChatMessage } from "@/types/database";

export const dynamic = "force-dynamic";

function error(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function blocked() {
  return NextResponse.json(
    { error: LIVE_CHAT_BLOCKED_MESSAGE, code: "LIVE_CHAT_BLOCKED" },
    { status: 403 },
  );
}

function limited(retryAfter: number) {
  return NextResponse.json(
    {
      error:
        "Çok fazla işlem yaptınız. Lütfen kısa bir süre sonra tekrar deneyin.",
      code: "LIVE_CHAT_RATE_LIMITED",
    },
    {
      status: 429,
      headers: { "Retry-After": String(Math.max(1, retryAfter)) },
    },
  );
}

async function withAttachmentUrls(
  client: NonNullable<ReturnType<typeof createVisitorChatClient>>,
  messages: LiveChatMessage[],
) {
  return Promise.all(
    messages.map(async (message) => {
      if (!message.attachment_path) return message;
      const signed = await client.storage
        .from("live-chat-images")
        .createSignedUrl(message.attachment_path, 3600);
      return {
        ...message,
        attachment_url: signed.data?.signedUrl ?? null,
      };
    }),
  );
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token")?.trim() ?? "";
  if (!isLiveChatToken(token)) return error("Geçersiz sohbet anahtarı.");
  const service = createServiceClient();
  if (!service) return error("Canlı destek şu anda kullanılamıyor.", 503);
  const identity = await resolveLiveChatIdentity(request, token);
  if ((await resolveLiveChatBlock(service, identity)).blocked) return blocked();
  const client = createVisitorChatClient(token);
  if (!client) return error("Canlı destek şu anda kullanılamıyor.", 503);
  const conversation = await client
    .from("live_chat_conversations")
    .select("*")
    .eq("visitor_token", token)
    .maybeSingle();
  if (conversation.error) return error("Sohbet yüklenemedi.", 500);
  if (!conversation.data)
    return NextResponse.json({ conversation: null, messages: [], calls: [] });
  const messages = await client
    .from("live_chat_messages")
    .select("*")
    .eq("conversation_id", conversation.data.id)
    .order("created_at", { ascending: true });
  if (messages.error) return error("Mesajlar yüklenemedi.", 500);
  const calls = await client
    .from("live_chat_calls")
    .select("*")
    .eq("conversation_id", conversation.data.id)
    .order("requested_at", { ascending: true });
  if (calls.error) return error("Görüşme geçmişi yüklenemedi.", 500);
  return NextResponse.json({
    conversation: conversation.data,
    messages: await withAttachmentUrls(client, messages.data),
    calls: calls.data,
  });
}

export async function POST(request: Request) {
  let payload: { token?: string; name?: string; message?: string };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return error("Geçersiz istek.");
  }
  const token = payload.token?.trim() ?? "";
  const name = payload.name?.trim() ?? "";
  const message = payload.message?.trim() ?? "";
  if (!isLiveChatToken(token)) return error("Geçersiz sohbet anahtarı.");
  if (name.length < 2 || name.length > 80)
    return error("Ad alanı 2–80 karakter olmalıdır.");
  if (!message || message.length > 2000)
    return error("Mesaj alanı 1–2000 karakter olmalıdır.");
  const client = createServiceClient();
  if (!client) return error("Canlı destek şu anda kullanılamıyor.", 503);
  const identity = await resolveLiveChatIdentity(request, token);
  if ((await resolveLiveChatBlock(client, identity)).blocked) return blocked();

  const messageLimit = await enforceLiveChatRateLimit(
    client,
    "message_send",
    identity,
  );
  if (!messageLimit.allowed) return limited(messageLimit.retryAfter);

  let conversation = await client
    .from("live_chat_conversations")
    .select("*")
    .eq("visitor_token", token)
    .maybeSingle();
  if (conversation.error) return error("Sohbet başlatılamadı.", 500);
  if (!conversation.data) {
    const createLimit = await enforceLiveChatRateLimit(
      client,
      "conversation_create",
      identity,
    );
    if (!createLimit.allowed) return limited(createLimit.retryAfter);
    conversation = await client
      .from("live_chat_conversations")
      .insert({ visitor_token: token, customer_name: name })
      .select("*")
      .single();
  }
  if (conversation.error || !conversation.data)
    return error("Sohbet başlatılamadı.", 500);

  try {
    await observeLiveChatIdentity(client, conversation.data, name, identity);
  } catch {
    return error("Canlı destek güvenlik kontrolü tamamlanamadı.", 503);
  }

  const sent = await client
    .from("live_chat_messages")
    .insert({
      conversation_id: conversation.data.id,
      sender: "customer",
      body: message,
    })
    .select("*")
    .single();
  if (sent.error) return error("Mesaj gönderilemedi.", 500);
  return NextResponse.json({
    conversation: conversation.data,
    message: sent.data,
  });
}

export async function PATCH(request: Request) {
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
  const client = createVisitorChatClient(token);
  if (!client) return error("Canlı destek şu anda kullanılamıyor.", 503);
  const updated = await client
    .from("live_chat_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .in("sender", ["admin", "ai"])
    .is("read_at", null);
  if (updated.error) return error("Okundu bilgisi güncellenemedi.", 500);
  return NextResponse.json({ ok: true });
}
