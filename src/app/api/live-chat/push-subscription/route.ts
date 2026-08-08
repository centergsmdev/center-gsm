import { NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/admin";

type SubscriptionBody = {
  token?: string;
  conversationId?: string;
  subscription?: {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };
};

function responseError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY?.trim();
  return publicKey
    ? NextResponse.json({ publicKey })
    : responseError("Bildirim servisi henüz yapılandırılmamış.", 503);
}

export async function POST(request: Request) {
  const body = (await request
    .json()
    .catch(() => null)) as SubscriptionBody | null;
  const token = body?.token?.trim();
  const conversationId = body?.conversationId?.trim();
  const endpoint = body?.subscription?.endpoint?.trim();
  const p256dh = body?.subscription?.keys?.p256dh?.trim();
  const auth = body?.subscription?.keys?.auth?.trim();
  if (!token || !conversationId || !endpoint || !p256dh || !auth)
    return responseError("Bildirim aboneliği geçersiz.", 400);

  const client = createServiceClient();
  if (!client) return responseError("Sunucu bağlantısı kurulamadı.", 503);
  const conversation = await client
    .from("live_chat_conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("visitor_token", token)
    .maybeSingle();
  if (conversation.error || !conversation.data)
    return responseError("Sohbet doğrulanamadı.", 403);

  const result = await client.from("live_chat_push_subscriptions").upsert(
    {
      conversation_id: conversationId,
      visitor_token: token,
      endpoint,
      p256dh,
      auth,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" },
  );
  return result.error
    ? responseError("Bildirim aboneliği kaydedilemedi.", 500)
    : NextResponse.json({ ok: true });
}
