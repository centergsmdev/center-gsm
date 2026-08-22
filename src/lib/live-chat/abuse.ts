import { createHmac } from "node:crypto";
import { isIP } from "node:net";

import { createClient } from "@/lib/supabase/server";
import type { createServiceClient } from "@/lib/supabase/admin";
import {
  LIVE_CHAT_ABUSE_TOKEN_KEY,
  LIVE_CHAT_DEVICE_PROFILE_HEADER,
  type CoarseDeviceProfile,
} from "@/lib/live-chat/abuse-shared";
import type {
  LiveChatAbuseIdentity,
  LiveChatBlock,
  LiveChatConversation,
} from "@/types/database";
import {
  relatedSignalReasons,
  selectMatchingBlock,
} from "@/lib/live-chat/block-policy";

type ServiceClient = NonNullable<ReturnType<typeof createServiceClient>>;

export type LiveChatIdentity = {
  visitorToken: string;
  userId: string | null;
  isAdmin: boolean;
  abuseTokenHash: string | null;
  ipHash: string | null;
  networkLabel: string | null;
  deviceProfileHash: string | null;
  profile: CoarseDeviceProfile | null;
};

export type ResolvedLiveChatBlock = {
  blocked: boolean;
  scope: "chat" | "site" | null;
  block: LiveChatBlock | null;
  matchedBy: "user" | "visitor" | "abuse_token" | "network" | null;
};

export type RelatedConversation = {
  conversation: LiveChatConversation;
  reasons: Array<
    "visitor" | "user" | "abuse_token" | "network" | "coarse_device"
  >;
  confidence: "strong" | "possible";
};

const ABUSE_TOKEN_PATTERN = /^[0-9a-f-]{36}$/i;
const PROFILE_VALUES = /^[\p{L}\p{N} ._+:/-]{1,80}$/u;

function secret() {
  return (
    process.env.LIVE_CHAT_ABUSE_HMAC_SECRET ?? process.env.SUPABASE_JWT_SECRET
  )?.trim();
}

export function hmacSignal(namespace: string, value: string) {
  const key = secret();
  if (!key || !value) return null;
  return createHmac("sha256", key)
    .update(`center-gsm:live-chat:${namespace}:v1:${value}`)
    .digest("hex");
}

function cookieValue(request: Request, key: string) {
  const cookie = request.headers.get("cookie") ?? "";
  for (const entry of cookie.split(";")) {
    const separator = entry.indexOf("=");
    if (separator < 0) continue;
    if (entry.slice(0, separator).trim() !== key) continue;
    return decodeURIComponent(entry.slice(separator + 1).trim());
  }
  return "";
}

export function trustedClientAddress(request: Request) {
  const vercel = process.env.VERCEL === "1";
  const trustLocalProxy = process.env.LIVE_CHAT_TRUST_PROXY_HEADERS === "true";
  const candidate = vercel
    ? request.headers.get("x-vercel-forwarded-for") ||
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip")
    : trustLocalProxy
      ? request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip")
      : null;
  const address = candidate?.split(",")[0]?.trim() ?? "";
  return isIP(address) ? address : null;
}

export function maskNetworkAddress(address: string | null) {
  if (!address) return null;
  if (isIP(address) === 4) {
    const parts = address.split(".");
    return `${parts[0]}.xxx.xxx.${parts[3]}`;
  }
  if (isIP(address) === 6) {
    const parts = address.split(":").filter(Boolean);
    return `${parts[0] ?? "xxxx"}:xxxx:…:${parts.at(-1) ?? "xxxx"}`;
  }
  return null;
}

function cleanProfileValue(value: unknown) {
  return typeof value === "string" && PROFILE_VALUES.test(value)
    ? value
    : "unknown";
}

function parseProfile(request: Request): CoarseDeviceProfile | null {
  const encoded = request.headers.get(LIVE_CHAT_DEVICE_PROFILE_HEADER);
  if (!encoded || encoded.length > 1000) return null;
  try {
    const raw = JSON.parse(
      decodeURIComponent(encoded),
    ) as Partial<CoarseDeviceProfile>;
    const viewportClass = ["small", "medium", "large"].includes(
      raw.viewportClass ?? "",
    )
      ? raw.viewportClass!
      : "medium";
    return {
      browserFamily: cleanProfileValue(raw.browserFamily),
      osFamily: cleanProfileValue(raw.osFamily),
      viewportClass,
      timezone: cleanProfileValue(raw.timezone),
      language: cleanProfileValue(raw.language),
    };
  } catch {
    return null;
  }
}

export async function resolveLiveChatIdentity(
  request: Request,
  visitorToken: string,
): Promise<LiveChatIdentity> {
  const auth = await createClient();
  const userResult = auth ? await auth.auth.getUser() : null;
  const user = userResult?.data.user ?? null;
  const abuseToken = cookieValue(request, LIVE_CHAT_ABUSE_TOKEN_KEY);
  const address = trustedClientAddress(request);
  const profile = parseProfile(request);
  return {
    visitorToken,
    userId: user?.id ?? null,
    isAdmin: user?.app_metadata.role === "admin",
    abuseTokenHash: ABUSE_TOKEN_PATTERN.test(abuseToken)
      ? hmacSignal("abuse-token", abuseToken)
      : null,
    ipHash: address ? hmacSignal("network", address) : null,
    networkLabel: maskNetworkAddress(address),
    deviceProfileHash: profile
      ? hmacSignal("coarse-device", JSON.stringify(profile))
      : null,
    profile,
  };
}

function signalFilters(identity: LiveChatIdentity) {
  return [
    identity.userId ? `user_id.eq.${identity.userId}` : null,
    identity.visitorToken ? `visitor_token.eq.${identity.visitorToken}` : null,
    identity.abuseTokenHash
      ? `abuse_token_hash.eq.${identity.abuseTokenHash}`
      : null,
    identity.ipHash ? `ip_hash.eq.${identity.ipHash}` : null,
  ].filter((value): value is string => Boolean(value));
}

export async function resolveLiveChatBlock(
  client: ServiceClient,
  identity: LiveChatIdentity,
  requestedScope: "chat" | "site" = "chat",
): Promise<ResolvedLiveChatBlock> {
  if (identity.isAdmin)
    return { blocked: false, scope: null, block: null, matchedBy: null };
  const filters = signalFilters(identity);
  if (!filters.length)
    return { blocked: false, scope: null, block: null, matchedBy: null };
  const result = await client
    .from("live_chat_blocks")
    .select("*")
    .is("revoked_at", null)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .or(filters.join(","));
  if (result.error) throw new Error("live_chat_block_lookup_failed");

  const match = selectMatchingBlock(
    result.data ?? [],
    identity,
    requestedScope,
  );
  return match
    ? {
        blocked: true,
        scope: match.block.scope,
        block: match.block,
        matchedBy: match.matchedBy,
      }
    : { blocked: false, scope: null, block: null, matchedBy: null };
}

export async function observeLiveChatIdentity(
  client: ServiceClient,
  conversation: Pick<LiveChatConversation, "id" | "visitor_token">,
  displayName: string,
  identity: LiveChatIdentity,
) {
  const current = await client
    .from("live_chat_abuse_identities")
    .select("*")
    .eq("conversation_id", conversation.id)
    .maybeSingle();
  const names = [
    ...new Set([...(current.data?.display_names ?? []), displayName.trim()]),
  ]
    .filter(Boolean)
    .slice(-20);
  const result = await client.from("live_chat_abuse_identities").upsert({
    conversation_id: conversation.id,
    visitor_token: conversation.visitor_token,
    user_id: identity.userId ?? current.data?.user_id ?? null,
    abuse_token_hash:
      identity.abuseTokenHash ?? current.data?.abuse_token_hash ?? null,
    ip_hash: identity.ipHash ?? current.data?.ip_hash ?? null,
    network_label: identity.networkLabel ?? current.data?.network_label ?? null,
    device_profile_hash:
      identity.deviceProfileHash ?? current.data?.device_profile_hash ?? null,
    browser_family:
      identity.profile?.browserFamily ?? current.data?.browser_family ?? null,
    os_family: identity.profile?.osFamily ?? current.data?.os_family ?? null,
    viewport_class:
      identity.profile?.viewportClass ?? current.data?.viewport_class ?? null,
    timezone: identity.profile?.timezone ?? current.data?.timezone ?? null,
    language: identity.profile?.language ?? current.data?.language ?? null,
    display_names: names,
    first_seen_at: current.data?.first_seen_at ?? new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
  });
  if (result.error) throw new Error("live_chat_identity_observation_failed");
}

const RATE_RULES = {
  conversation_create: [
    { limit: 3, window: 300, cooldown: 60 },
    { limit: 6, window: 1800, cooldown: 300 },
    { limit: 12, window: 86400, cooldown: 1800 },
  ],
  message_send: [
    { limit: 20, window: 60, cooldown: 30 },
    { limit: 60, window: 300, cooldown: 120 },
    { limit: 500, window: 86400, cooldown: 900 },
  ],
  image_upload: [
    { limit: 8, window: 300, cooldown: 120 },
    { limit: 30, window: 86400, cooldown: 1800 },
  ],
  video_request: [
    { limit: 5, window: 1800, cooldown: 300 },
    { limit: 10, window: 86400, cooldown: 1800 },
  ],
} as const;

export async function enforceLiveChatRateLimit(
  client: ServiceClient,
  action: keyof typeof RATE_RULES,
  identity: LiveChatIdentity,
) {
  if (identity.isAdmin) return { allowed: true, retryAfter: 0 };
  const keys = [
    hmacSignal("rate-visitor", identity.visitorToken),
    identity.userId ? hmacSignal("rate-user", identity.userId) : null,
    identity.abuseTokenHash
      ? hmacSignal("rate-abuse", identity.abuseTokenHash)
      : null,
    identity.ipHash ? hmacSignal("rate-network", identity.ipHash) : null,
  ].filter((value): value is string => Boolean(value));
  let retryAfter = 0;
  for (const rule of RATE_RULES[action]) {
    const result = await client.rpc("consume_live_chat_rate_limit", {
      p_action: action,
      p_key_hashes: keys,
      p_limit: rule.limit,
      p_window_seconds: rule.window,
      p_cooldown_seconds: rule.cooldown,
    });
    if (result.error) throw new Error("live_chat_rate_limit_failed");
    const value = result.data as { allowed?: boolean; retryAfter?: number };
    if (value.allowed === false)
      retryAfter = Math.max(
        retryAfter,
        Number(value.retryAfter) || rule.cooldown,
      );
  }
  return { allowed: retryAfter === 0, retryAfter };
}

export async function getRelatedConversations(
  client: ServiceClient,
  conversationId: string,
): Promise<{
  current: LiveChatAbuseIdentity | null;
  items: RelatedConversation[];
}> {
  const currentResult = await client
    .from("live_chat_abuse_identities")
    .select("*")
    .eq("conversation_id", conversationId)
    .maybeSingle();
  const current = currentResult.data;
  if (!current) return { current: null, items: [] };
  const filters = [
    `visitor_token.eq.${current.visitor_token}`,
    current.user_id ? `user_id.eq.${current.user_id}` : null,
    current.abuse_token_hash
      ? `abuse_token_hash.eq.${current.abuse_token_hash}`
      : null,
    current.ip_hash ? `ip_hash.eq.${current.ip_hash}` : null,
    current.device_profile_hash
      ? `device_profile_hash.eq.${current.device_profile_hash}`
      : null,
  ].filter((value): value is string => Boolean(value));
  const relatedResult = await client
    .from("live_chat_abuse_identities")
    .select("*")
    .neq("conversation_id", conversationId)
    .or(filters.join(","))
    .order("last_seen_at", { ascending: false })
    .limit(50);
  const identities = relatedResult.data ?? [];
  if (!identities.length) return { current, items: [] };
  const conversations = await client
    .from("live_chat_conversations")
    .select("*")
    .in(
      "id",
      identities.map((item) => item.conversation_id),
    );
  const byId = new Map(
    (conversations.data ?? []).map((item) => [item.id, item]),
  );
  const items = identities.flatMap((item) => {
    const conversation = byId.get(item.conversation_id);
    if (!conversation) return [];
    const reasons = relatedSignalReasons(current, item).filter(
      (reason) =>
        reason !== "coarse_device" ||
        Date.now() - new Date(item.last_seen_at).getTime() < 7 * 86400000,
    );
    const strong = reasons.some((reason) =>
      ["visitor", "user", "abuse_token"].includes(reason),
    );
    return [
      {
        conversation,
        reasons,
        confidence: strong ? ("strong" as const) : ("possible" as const),
      },
    ];
  });
  return { current, items };
}
