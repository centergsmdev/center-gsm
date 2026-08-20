import { createHash, timingSafeEqual } from "node:crypto";

export function hashText(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function safeTokenMatch(
  storedHash: string | null,
  token: string | null,
) {
  if (!storedHash || !token) return false;
  const actual = Buffer.from(hashText(token), "hex");
  const expected = Buffer.from(storedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
