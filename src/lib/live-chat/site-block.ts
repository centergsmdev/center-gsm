import { createClient } from "@supabase/supabase-js";

import {
  LIVE_CHAT_ABUSE_TOKEN_KEY,
  LIVE_CHAT_VISITOR_COOKIE_KEY,
} from "@/lib/live-chat/abuse-shared";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import type { Database, LiveChatBlock } from "@/types/database";

function readCookie(request: Request, key: string) {
  const source = request.headers.get("cookie") ?? "";
  const entry = source
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${key}=`));
  return entry ? decodeURIComponent(entry.slice(key.length + 1)) : "";
}

async function edgeHmac(namespace: string, value: string) {
  const secret = (
    process.env.LIVE_CHAT_ABUSE_HMAC_SECRET ?? process.env.SUPABASE_JWT_SECRET
  )?.trim();
  if (!secret || !value) return null;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`center-gsm:live-chat:${namespace}:v1:${value}`),
  );
  return Array.from(new Uint8Array(signature), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export async function resolveSiteAccessBlock(
  request: Request,
  userId: string | null,
  isAdmin: boolean,
) {
  if (isAdmin) return null;
  const visitorToken = readCookie(request, LIVE_CHAT_VISITOR_COOKIE_KEY);
  const abuseToken = readCookie(request, LIVE_CHAT_ABUSE_TOKEN_KEY);
  const abuseHash = /^[0-9a-f-]{36}$/i.test(abuseToken)
    ? await edgeHmac("abuse-token", abuseToken)
    : null;
  const filters = [
    userId ? `user_id.eq.${userId}` : null,
    /^[0-9a-f-]{36}$/i.test(visitorToken)
      ? `visitor_token.eq.${visitorToken}`
      : null,
    abuseHash ? `abuse_token_hash.eq.${abuseHash}` : null,
  ].filter((value): value is string => Boolean(value));
  if (!filters.length) return null;
  const config = getSupabasePublicConfig();
  const serviceKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY
  )?.trim();
  if (!config || !serviceKey) return null;
  const service = createClient<Database>(config.url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const result = await service
    .from("live_chat_blocks")
    .select("*")
    .eq("scope", "site")
    .is("revoked_at", null)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .or(filters.join(","));
  return (
    (result.data ?? []).find(
      (block: LiveChatBlock) =>
        (userId && block.user_id === userId) ||
        (visitorToken &&
          abuseHash &&
          block.visitor_token === visitorToken &&
          block.abuse_token_hash === abuseHash),
    ) ?? null
  );
}
