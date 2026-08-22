import { createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_CONTEXT = "center-gsm:installment-customer-portal:v1";

type PortalAccessClaims = {
  portalId: string;
  accessVersion: number;
  accessExpiresAt: string;
};

function expirySeconds(value: string) {
  const milliseconds = new Date(value).getTime();
  return Number.isFinite(milliseconds) ? Math.floor(milliseconds / 1000) : 0;
}

function signatureFor(claims: PortalAccessClaims, secret: string) {
  return createHmac("sha256", secret)
    .update(
      `${TOKEN_CONTEXT}:${claims.portalId}:${claims.accessVersion}:${expirySeconds(claims.accessExpiresAt)}`,
    )
    .digest("base64url");
}

export function createPortalAccessToken(
  claims: PortalAccessClaims,
  secret: string,
) {
  const expiresAt = expirySeconds(claims.accessExpiresAt);
  if (!secret || expiresAt < 1 || claims.accessVersion < 1) return "";
  return `${claims.accessVersion}.${expiresAt}.${signatureFor(claims, secret)}`;
}

export function verifyPortalAccessToken(
  token: string | null | undefined,
  claims: PortalAccessClaims,
  secret: string,
  now = Date.now(),
) {
  if (!token || !secret) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const version = Number(parts[0]);
  const expiresAt = Number(parts[1]);
  const expectedExpiry = expirySeconds(claims.accessExpiresAt);
  if (
    !Number.isSafeInteger(version) ||
    !Number.isSafeInteger(expiresAt) ||
    version !== claims.accessVersion ||
    expiresAt !== expectedExpiry ||
    expiresAt * 1000 <= now
  )
    return false;
  const actual = Buffer.from(parts[2], "utf8");
  const expected = Buffer.from(signatureFor(claims, secret), "utf8");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function portalAccessCookieName(portalId: string) {
  return `cg_installment_${portalId.replace(/-/g, "")}`;
}

export function newPortalAccessExpiry(now = new Date()) {
  return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
}
