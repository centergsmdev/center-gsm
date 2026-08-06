import { NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ conversationId: string }> },
) {
  const authClient = await createClient();
  if (!authClient) return error("Sunucu bağlantısı kurulamadı.", 503);

  const { data: authData, error: authError } = await authClient.auth.getUser();
  if (authError || authData.user?.app_metadata.role !== "admin")
    return error("Bu işlem için yetkiniz yok.", 403);

  const { conversationId } = await context.params;
  const id = conversationId.trim();
  if (!id) return error("Geçersiz sohbet bilgisi.", 400);

  const serviceClient = createServiceClient();
  if (!serviceClient) return error("Sunucu bağlantısı kurulamadı.", 503);

  const conversation = await serviceClient
    .from("live_chat_conversations")
    .select("id, visitor_token")
    .eq("id", id)
    .maybeSingle();
  if (conversation.error) return error("Sohbet bilgisi alınamadı.", 500);
  if (!conversation.data) return error("Sohbet bulunamadı.", 404);

  const attachments = await serviceClient
    .from("live_chat_messages")
    .select("attachment_path")
    .eq("conversation_id", id)
    .not("attachment_path", "is", null);
  if (attachments.error) return error("Sohbet ekleri okunamadı.", 500);

  const paths = attachments.data
    .map((item) => item.attachment_path)
    .filter((path): path is string => Boolean(path));
  if (paths.length) {
    const removed = await serviceClient.storage
      .from("live-chat-images")
      .remove(paths);
    if (removed.error) return error("Sohbet görselleri silinemedi.", 500);
  }

  const deleted = await serviceClient
    .from("live_chat_conversations")
    .delete()
    .eq("id", id);
  if (deleted.error) return error("Sohbet silinemedi.", 500);

  const channel = serviceClient.channel(
    `live-chat:${conversation.data.visitor_token}`,
  );
  await channel.httpSend("conversation_deleted", { conversationId: id });
  await serviceClient.removeChannel(channel);

  return NextResponse.json({ ok: true });
}
