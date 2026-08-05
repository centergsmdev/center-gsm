import { NextResponse } from "next/server";

import {
  createVisitorChatClient,
  isLiveChatToken,
} from "@/lib/live-chat/server";

export const dynamic = "force-dynamic";

function error(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token")?.trim() ?? "";
  if (!isLiveChatToken(token)) return error("Geçersiz sohbet anahtarı.");
  const client = createVisitorChatClient(token);
  if (!client) return error("Canlı destek şu anda kullanılamıyor.", 503);
  const conversation = await client
    .from("live_chat_conversations")
    .select("*")
    .eq("visitor_token", token)
    .maybeSingle();
  if (conversation.error) return error("Sohbet yüklenemedi.", 500);
  if (!conversation.data)
    return NextResponse.json({ conversation: null, messages: [] });
  const messages = await client
    .from("live_chat_messages")
    .select("*")
    .eq("conversation_id", conversation.data.id)
    .order("created_at", { ascending: true });
  if (messages.error) return error("Mesajlar yüklenemedi.", 500);
  return NextResponse.json({
    conversation: conversation.data,
    messages: messages.data,
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
  const client = createVisitorChatClient(token);
  if (!client) return error("Canlı destek şu anda kullanılamıyor.", 503);

  let conversation = await client
    .from("live_chat_conversations")
    .select("*")
    .eq("visitor_token", token)
    .maybeSingle();
  if (conversation.error) return error("Sohbet başlatılamadı.", 500);
  if (!conversation.data) {
    conversation = await client
      .from("live_chat_conversations")
      .insert({ visitor_token: token, customer_name: name })
      .select("*")
      .single();
  }
  if (conversation.error || !conversation.data)
    return error("Sohbet başlatılamadı.", 500);

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
