import { NextResponse } from "next/server";

import { requireLiveChatAdmin } from "@/lib/live-chat/admin-security";
import type { LiveChatBlock } from "@/types/database";

const REASONS = new Set([
  "spam",
  "unnecessary_messages",
  "harassment",
  "fake_names",
  "video_abuse",
  "other",
]);
const MODES = new Set(["visitor", "visitor_network", "site"]);
const DURATIONS: Record<string, number | null> = {
  "1h": 3600,
  "24h": 86400,
  "7d": 604800,
  permanent: null,
};

async function relatedCount(
  service: NonNullable<
    Awaited<ReturnType<typeof requireLiveChatAdmin>>["service"]
  >,
  block: LiveChatBlock,
) {
  const filters = [
    block.visitor_token ? `visitor_token.eq.${block.visitor_token}` : null,
    block.user_id ? `user_id.eq.${block.user_id}` : null,
    block.abuse_token_hash
      ? `abuse_token_hash.eq.${block.abuse_token_hash}`
      : null,
    block.ip_hash ? `ip_hash.eq.${block.ip_hash}` : null,
  ].filter((value): value is string => Boolean(value));
  if (!filters.length) return 0;
  const result = await service
    .from("live_chat_abuse_identities")
    .select("conversation_id", { count: "exact", head: true })
    .or(filters.join(","));
  return result.count ?? 0;
}

export async function GET() {
  const auth = await requireLiveChatAdmin();
  if (!auth.service) return auth.error;
  const result = await auth.service
    .from("live_chat_blocks")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(300);
  if (result.error)
    return NextResponse.json(
      { error: "Engel listesi alınamadı." },
      { status: 500 },
    );
  const adminIds = [
    ...new Set(
      (result.data ?? [])
        .flatMap((item) => [item.created_by, item.revoked_by])
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const adminNames = new Map<string, string>();
  await Promise.all(
    adminIds.map(async (id) => {
      const user = await auth.service!.auth.admin.getUserById(id);
      adminNames.set(id, user.data.user?.email ?? "Yönetici");
    }),
  );
  const blocks = await Promise.all(
    (result.data ?? []).map(async (block) => ({
      ...block,
      admin_name: adminNames.get(block.created_by) ?? "Yönetici",
      related_count: await relatedCount(auth.service!, block),
      active:
        !block.revoked_at &&
        (!block.expires_at ||
          new Date(block.expires_at).getTime() > Date.now()),
    })),
  );
  return NextResponse.json({ blocks });
}

export async function POST(request: Request) {
  const auth = await requireLiveChatAdmin(request);
  if (!auth.service || !auth.user) return auth.error;
  const body = (await request.json().catch(() => null)) as {
    conversationId?: string;
    targetMode?: string;
    reason?: string;
    note?: string;
    duration?: string;
  } | null;
  const conversationId = body?.conversationId?.trim() ?? "";
  const targetMode = body?.targetMode ?? "visitor_network";
  const reason = body?.reason ?? "";
  const duration = body?.duration ?? "permanent";
  const note = body?.note?.trim().slice(0, 1000) || null;
  if (
    !conversationId ||
    !MODES.has(targetMode) ||
    !REASONS.has(reason) ||
    !(duration in DURATIONS)
  )
    return NextResponse.json(
      { error: "Engel bilgileri geçersiz." },
      { status: 400 },
    );
  const [conversation, identity] = await Promise.all([
    auth.service
      .from("live_chat_conversations")
      .select("*")
      .eq("id", conversationId)
      .maybeSingle(),
    auth.service
      .from("live_chat_abuse_identities")
      .select("*")
      .eq("conversation_id", conversationId)
      .maybeSingle(),
  ]);
  if (!conversation.data)
    return NextResponse.json({ error: "Sohbet bulunamadı." }, { status: 404 });
  if (targetMode === "visitor_network" && !identity.data?.ip_hash)
    return NextResponse.json(
      {
        error:
          "Bu görüşme için güvenilir bağlantı sinyali henüz bulunmuyor. Yalnız ziyaretçi engelini seçin.",
      },
      { status: 409 },
    );
  if (
    targetMode === "site" &&
    !identity.data?.user_id &&
    !(identity.data?.visitor_token && identity.data?.abuse_token_hash)
  )
    return NextResponse.json(
      {
        error:
          "Site erişim engeli için daha güçlü bir kimlik sinyali gerekiyor.",
      },
      { status: 409 },
    );
  const seconds = DURATIONS[duration];
  const expiresAt = seconds
    ? new Date(Date.now() + seconds * 1000).toISOString()
    : null;
  const inserted = await auth.service
    .from("live_chat_blocks")
    .insert({
      scope: targetMode === "site" ? "site" : "chat",
      target_mode: targetMode as LiveChatBlock["target_mode"],
      visitor_token: conversation.data.visitor_token,
      user_id: identity.data?.user_id ?? null,
      abuse_token_hash: identity.data?.abuse_token_hash ?? null,
      ip_hash:
        targetMode === "visitor" ? null : (identity.data?.ip_hash ?? null),
      display_name_snapshot: conversation.data.customer_name,
      network_label: identity.data?.network_label ?? null,
      reason: reason as LiveChatBlock["reason"],
      admin_note: reason === "other" ? note : null,
      created_by: auth.user.id,
      expires_at: expiresAt,
    })
    .select("*")
    .single();
  if (inserted.error)
    return NextResponse.json(
      { error: "Engel kaydedilemedi." },
      { status: 500 },
    );

  await auth.service.rpc("end_live_chat_calls_for_block", {
    p_conversation_id: conversationId,
  });
  const channel = auth.service.channel(
    `live-chat:${conversation.data.visitor_token}`,
  );
  await channel.httpSend("access_blocked", { conversationId });
  await auth.service.removeChannel(channel);
  return NextResponse.json({ block: inserted.data }, { status: 201 });
}
