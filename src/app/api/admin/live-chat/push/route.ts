import { NextResponse } from "next/server";
import webpush from "web-push";

import { createServiceClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function responseError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const authClient = await createClient();
  if (!authClient) return responseError("Sunucu bağlantısı kurulamadı.", 503);
  const { data: authData } = await authClient.auth.getUser();
  if (authData.user?.app_metadata.role !== "admin")
    return responseError("Bu işlem için yetkiniz yok.", 403);

  const body = (await request.json().catch(() => null)) as {
    conversationId?: string;
    messageId?: string;
  } | null;
  if (!body?.conversationId || !body.messageId)
    return responseError("Mesaj bilgisi geçersiz.", 400);

  const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY?.trim();
  if (!publicKey || !privateKey)
    return responseError("Bildirim servisi henüz yapılandırılmamış.", 503);
  webpush.setVapidDetails("https://centergsm.com.tr", publicKey, privateKey);

  const client = createServiceClient();
  if (!client) return responseError("Sunucu bağlantısı kurulamadı.", 503);
  const message = await client
    .from("live_chat_messages")
    .select("id, body, sender")
    .eq("id", body.messageId)
    .eq("conversation_id", body.conversationId)
    .maybeSingle();
  if (message.error || !message.data || message.data.sender !== "admin")
    return responseError("Mesaj doğrulanamadı.", 404);

  const subscriptions = await client
    .from("live_chat_push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("conversation_id", body.conversationId);
  if (subscriptions.error) return responseError("Abonelikler okunamadı.", 500);

  const payload = JSON.stringify({
    title: "CENTER GSM Canlı Destek",
    body: message.data.body.slice(0, 160),
    tag: `live-chat-${body.conversationId}`,
    url: "/?liveChat=1",
  });
  const staleIds: string[] = [];
  await Promise.allSettled(
    subscriptions.data.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          payload,
        );
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410)
          staleIds.push(subscription.id);
      }
    }),
  );
  if (staleIds.length)
    await client
      .from("live_chat_push_subscriptions")
      .delete()
      .in("id", staleIds);
  return NextResponse.json({
    ok: true,
    delivered: subscriptions.data.length - staleIds.length,
  });
}
