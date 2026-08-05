import { NextResponse } from "next/server";

import { createAiAnswer } from "@/lib/live-chat/ai";
import { isLiveChatToken } from "@/lib/live-chat/server";
import { createServiceClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function quiet() {
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  let payload: { token?: string; messageId?: string };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return quiet();
  }
  const token = payload.token?.trim() ?? "";
  const messageId = payload.messageId?.trim() ?? "";
  if (!isLiveChatToken(token) || !messageId) return quiet();
  const client = createServiceClient();
  if (!client) return quiet();

  const conversation = await client
    .from("live_chat_conversations")
    .select("*")
    .eq("visitor_token", token)
    .maybeSingle();
  if (!conversation.data?.ai_active) return quiet();
  const settings = await client
    .from("live_chat_settings")
    .select("*")
    .eq("id", true)
    .maybeSingle();
  if (!settings.data?.ai_enabled) return quiet();
  const source = await client
    .from("live_chat_messages")
    .select("*")
    .eq("id", messageId)
    .eq("conversation_id", conversation.data.id)
    .eq("sender", "customer")
    .maybeSingle();
  if (!source.data) return quiet();
  const existing = await client
    .from("live_chat_messages")
    .select("id")
    .eq("reply_to_message_id", messageId)
    .eq("sender", "ai")
    .maybeSingle();
  if (existing.data) return quiet();
  const history = await client
    .from("live_chat_messages")
    .select("*")
    .eq("conversation_id", conversation.data.id)
    .order("created_at", { ascending: true })
    .limit(20);
  if (history.error) return quiet();

  const channel = client.channel(`live-chat:${token}`);
  await channel.httpSend("typing", { role: "ai", typing: true });
  const answer = await createAiAnswer(source.data.body, history.data);
  if (!answer) {
    await channel.httpSend("typing", { role: "ai", typing: false });
    await client.removeChannel(channel);
    return quiet();
  }

  const [latestConversation, latestSettings] = await Promise.all([
    client
      .from("live_chat_conversations")
      .select("ai_active")
      .eq("id", conversation.data.id)
      .single(),
    client
      .from("live_chat_settings")
      .select("ai_enabled")
      .eq("id", true)
      .single(),
  ]);
  if (!latestConversation.data?.ai_active || !latestSettings.data?.ai_enabled) {
    await channel.httpSend("typing", { role: "ai", typing: false });
    await client.removeChannel(channel);
    return quiet();
  }
  const inserted = await client
    .from("live_chat_messages")
    .insert({
      conversation_id: conversation.data.id,
      sender: "ai",
      body: answer,
      reply_to_message_id: messageId,
    })
    .select("*")
    .single();
  if (!inserted.data) {
    await channel.httpSend("typing", { role: "ai", typing: false });
    await client.removeChannel(channel);
    return quiet();
  }
  await channel.httpSend("message", inserted.data);
  await channel.httpSend("typing", { role: "ai", typing: false });
  await client.removeChannel(channel);
  return quiet();
}
