import "server-only";

import { createHmac, randomBytes } from "node:crypto";

export { hashText, safeTokenMatch } from "@/lib/installment/access-token";

const DRAFT_COOKIE = "center_gsm_installment_draft";

export const INSTALLMENT_DRAFT_COOKIE = DRAFT_COOKIE;

export function createDraftToken() {
  return randomBytes(32).toString("base64url");
}

export function createApplicationNumber() {
  const year = new Date().getUTCFullYear();
  return `ET-${year}-${randomBytes(8).toString("hex").toUpperCase()}`;
}

export function sameOriginRequest(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export function clientIp(request: Request) {
  const source =
    request.headers.get("x-vercel-forwarded-for") ??
    request.headers.get("x-forwarded-for") ??
    request.headers.get("x-real-ip") ??
    "unknown";
  return source.split(",")[0].trim().slice(0, 80);
}

export function clientIpHash(request: Request, secret: string) {
  return createHmac("sha256", secret)
    .update(`installment-ip:${clientIp(request)}`)
    .digest("hex");
}

export function safeUserAgent(request: Request) {
  return request.headers.get("user-agent")?.slice(0, 300) ?? null;
}

export function sanitizeOriginalFileName(value: string) {
  const name = value
    .normalize("NFKC")
    .replace(/[\\/\u0000-\u001f\u007f]/g, "_")
    .trim();
  return (name || "belge").slice(0, 180);
}
