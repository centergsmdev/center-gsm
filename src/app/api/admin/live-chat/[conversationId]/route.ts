import { NextResponse } from "next/server";

import { requireAdminDeletionPassword } from "@/lib/admin/deletion-password";
import { requireAdmin } from "@/lib/admin/require-admin";
import { isUuid } from "@/lib/installment/validation";

export const runtime = "nodejs";

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ conversationId: string }> },
) {
  const { conversationId } = await context.params;
  const id = conversationId.trim();
  if (!isUuid(id)) return error("Geçersiz sohbet bilgisi.", 400);

  const admin = await requireAdmin(request);
  if (admin.error) return admin.error;

  let body: { password?: unknown };
  try {
    body = (await request.json()) as { password?: unknown };
  } catch {
    return error("Silme şifresi okunamadı.", 400);
  }
  const passwordError = await requireAdminDeletionPassword(
    admin.service,
    body.password,
  );
  if (passwordError) return passwordError;

  const conversation = await admin.service
    .from("live_chat_conversations")
    .select("id, visitor_token")
    .eq("id", id)
    .maybeSingle();
  if (conversation.error) return error("Sohbet bilgisi alınamadı.", 500);
  if (!conversation.data) return error("Sohbet bulunamadı.", 404);

  const attachments = await admin.service
    .from("live_chat_messages")
    .select("attachment_path")
    .eq("conversation_id", id)
    .not("attachment_path", "is", null);
  if (attachments.error) return error("Sohbet ekleri okunamadı.", 500);

  const paths = attachments.data
    .map((item) => item.attachment_path)
    .filter((path): path is string => Boolean(path));
  const deleted = await admin.service
    .from("live_chat_conversations")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (deleted.error) return error("Sohbet silinemedi.", 500);
  if (!deleted.data) return error("Sohbet bulunamadı.", 404);

  const removed = paths.length
    ? await admin.service.storage.from("live-chat-images").remove(paths)
    : { error: null };

  const channel = admin.service.channel(
    `live-chat:${conversation.data.visitor_token}`,
  );
  await channel.httpSend("conversation_deleted", { conversationId: id });
  await admin.service.removeChannel(channel);

  return NextResponse.json(
    {
      ok: true,
      warning: removed.error
        ? "Sohbet silindi ancak bazı görseller temizlenemedi."
        : null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
