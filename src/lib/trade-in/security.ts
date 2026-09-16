import "server-only";

import { createHmac, randomBytes } from "node:crypto";

export function createTradeInApplicationNumber() {
  const year = new Date().getUTCFullYear();
  return `TK-${year}-${randomBytes(6).toString("hex").toUpperCase()}`;
}

export function isTradeInSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export function tradeInIpHash(request: Request, secret: string) {
  const source =
    request.headers.get("x-vercel-forwarded-for") ??
    request.headers.get("x-forwarded-for") ??
    request.headers.get("x-real-ip") ??
    "unknown";
  const ip = source.split(",")[0].trim().slice(0, 80);
  return createHmac("sha256", secret).update(`trade-in:${ip}`).digest("hex");
}

export function tradeInHashSecret() {
  return (
    process.env.INSTALLMENT_SECURITY_SECRET ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SECRET_KEY ??
    ""
  ).trim();
}

export function safeTradeInUserAgent(request: Request) {
  return request.headers.get("user-agent")?.slice(0, 300) ?? null;
}
