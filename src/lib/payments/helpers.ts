import { PaymentGatewayError } from "./errors";
import type { Json } from "@/types/database";
export async function sha256(value: string) {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(hash)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
export async function hmacSha256(value: string, secret: string) {
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
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(signature)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
export function timingSafeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i++)
    diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return diff === 0;
}
export function parseWebhookJson(
  raw: string,
): Record<string, Json | undefined> {
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || Array.isArray(value) || typeof value !== "object")
      throw new Error();
    return value as Record<string, Json | undefined>;
  } catch {
    throw new PaymentGatewayError(
      "INVALID_PAYLOAD",
      "Webhook verisi geçersiz.",
    );
  }
}
export const gatewayMoney = (value: number) => Math.round(value * 100) / 100;
