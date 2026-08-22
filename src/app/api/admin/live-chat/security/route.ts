import { NextResponse } from "next/server";

import { requireLiveChatAdmin } from "@/lib/live-chat/admin-security";
import { getRelatedConversations } from "@/lib/live-chat/abuse";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireLiveChatAdmin();
  if (!auth.service) return auth.error;
  const conversationId = new URL(request.url).searchParams
    .get("conversationId")
    ?.trim();
  if (!conversationId)
    return NextResponse.json(
      { error: "Geçersiz sohbet bilgisi." },
      { status: 400 },
    );
  const conversation = await auth.service
    .from("live_chat_conversations")
    .select("*")
    .eq("id", conversationId)
    .maybeSingle();
  if (!conversation.data)
    return NextResponse.json({ error: "Sohbet bulunamadı." }, { status: 404 });
  const related = await getRelatedConversations(auth.service, conversationId);
  const blocks = await auth.service
    .from("live_chat_blocks")
    .select("*")
    .is("revoked_at", null)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .or(
      [
        `visitor_token.eq.${conversation.data.visitor_token}`,
        related.current?.user_id
          ? `user_id.eq.${related.current.user_id}`
          : null,
        related.current?.abuse_token_hash
          ? `abuse_token_hash.eq.${related.current.abuse_token_hash}`
          : null,
        related.current?.ip_hash
          ? `ip_hash.eq.${related.current.ip_hash}`
          : null,
      ]
        .filter(Boolean)
        .join(","),
    );
  const names = [
    conversation.data.customer_name,
    ...(related.current?.display_names ?? []),
    ...related.items.flatMap((item) => [item.conversation.customer_name]),
  ];
  return NextResponse.json({
    conversation: conversation.data,
    identity: related.current,
    activeBlocks: blocks.data ?? [],
    related: related.items,
    names: [...new Set(names.filter(Boolean))],
    summary: {
      total: related.items.length,
      strong: related.items.filter((item) => item.confidence === "strong")
        .length,
      network: related.items.filter((item) => item.reasons.includes("network"))
        .length,
      differentNames: new Set(names.filter(Boolean)).size,
    },
  });
}
