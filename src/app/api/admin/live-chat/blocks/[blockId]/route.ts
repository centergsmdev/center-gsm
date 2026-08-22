import { NextResponse } from "next/server";

import { requireLiveChatAdmin } from "@/lib/live-chat/admin-security";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ blockId: string }> },
) {
  const auth = await requireLiveChatAdmin(request);
  if (!auth.service || !auth.user) return auth.error;
  const { blockId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { note?: string };
  const current = await auth.service
    .from("live_chat_blocks")
    .select("*")
    .eq("id", blockId)
    .maybeSingle();
  if (!current.data)
    return NextResponse.json(
      { error: "Engel kaydı bulunamadı." },
      { status: 404 },
    );
  if (current.data.revoked_at)
    return NextResponse.json({ block: current.data });
  const updated = await auth.service
    .from("live_chat_blocks")
    .update({
      revoked_at: new Date().toISOString(),
      revoked_by: auth.user.id,
      revoke_note: body.note?.trim().slice(0, 500) || null,
    })
    .eq("id", blockId)
    .is("revoked_at", null)
    .select("*")
    .single();
  if (updated.error)
    return NextResponse.json(
      { error: "Engel kaldırılamadı." },
      { status: 500 },
    );
  return NextResponse.json({ block: updated.data });
}
