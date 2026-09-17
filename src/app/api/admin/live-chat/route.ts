import { NextResponse } from "next/server";

import { requireAdminDeletionPassword } from "@/lib/admin/deletion-password";
import { requireAdmin } from "@/lib/admin/require-admin";

export const runtime = "nodejs";

const error = (message: string, status: number) =>
  NextResponse.json({ error: message }, { status });

function chunks<T>(items: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size)
    result.push(items.slice(index, index + size));
  return result;
}

export async function DELETE(request: Request) {
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

  const [conversations, attachments] = await Promise.all([
    admin.service.from("live_chat_conversations").select("id, visitor_token"),
    admin.service
      .from("live_chat_messages")
      .select("attachment_path")
      .not("attachment_path", "is", null),
  ]);
  if (conversations.error || attachments.error)
    return error("Sohbet bilgileri alınamadı.", 500);

  if (!conversations.data.length)
    return NextResponse.json(
      { ok: true, deletedCount: 0, warning: null },
      { headers: { "Cache-Control": "no-store" } },
    );

  const deleted = await admin.service
    .from("live_chat_conversations")
    .delete()
    .not("id", "is", null)
    .select("id");
  if (deleted.error) return error("Sohbetler silinemedi.", 500);

  const paths = [
    ...new Set(
      attachments.data
        .map((item) => item.attachment_path)
        .filter((path): path is string => Boolean(path)),
    ),
  ];
  const storageResults = await Promise.all(
    chunks(paths, 100).map((batch) =>
      admin.service.storage.from("live-chat-images").remove(batch),
    ),
  );

  for (const conversation of conversations.data) {
    const channel = admin.service.channel(
      `live-chat:${conversation.visitor_token}`,
    );
    await channel.httpSend("conversation_deleted", {
      conversationId: conversation.id,
    });
    await admin.service.removeChannel(channel);
  }

  return NextResponse.json(
    {
      ok: true,
      deletedCount: deleted.data.length,
      warning: storageResults.some((item) => item.error)
        ? "Sohbetler silindi ancak bazı görseller temizlenemedi."
        : null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
