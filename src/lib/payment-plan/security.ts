import { createHmac, timingSafeEqual } from "node:crypto";

const PAYMENT_OFFER_LIFETIME_MS = 2 * 60 * 60 * 1000;

type PaymentOfferPayload = {
  v: 1;
  configId: string;
  configRevision: number;
  productId: string;
  variantId: string | null;
  productPriceMinor: number;
  presentedAt: string;
  expiresAt: number;
};

function sign(encoded: string, secret: string) {
  return createHmac("sha256", secret).update(encoded).digest("base64url");
}

export function createPaymentPlanOfferToken(
  payload: Omit<PaymentOfferPayload, "v" | "expiresAt">,
  secret: string,
  now = Date.now(),
) {
  const encoded = Buffer.from(
    JSON.stringify({
      ...payload,
      v: 1,
      expiresAt: now + PAYMENT_OFFER_LIFETIME_MS,
    } satisfies PaymentOfferPayload),
    "utf8",
  ).toString("base64url");
  return `${encoded}.${sign(encoded, secret)}`;
}

export function verifyPaymentPlanOfferToken(
  token: string,
  expected: { productId: string; variantId: string | null },
  secret: string,
  now = Date.now(),
) {
  const [encoded, signature, extra] = token.split(".");
  if (!encoded || !signature || extra || !secret) return null;
  const calculated = sign(encoded, secret);
  const receivedBuffer = Buffer.from(signature);
  const calculatedBuffer = Buffer.from(calculated);
  if (
    receivedBuffer.length !== calculatedBuffer.length ||
    !timingSafeEqual(receivedBuffer, calculatedBuffer)
  )
    return null;
  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as PaymentOfferPayload;
    const presentedAt = Date.parse(payload.presentedAt);
    if (
      payload.v !== 1 ||
      payload.productId !== expected.productId ||
      payload.variantId !== expected.variantId ||
      !Number.isSafeInteger(payload.configRevision) ||
      payload.configRevision < 1 ||
      !Number.isSafeInteger(payload.productPriceMinor) ||
      payload.productPriceMinor < 0 ||
      !Number.isFinite(presentedAt) ||
      presentedAt > now + 5 * 60 * 1000 ||
      !Number.isFinite(payload.expiresAt) ||
      payload.expiresAt < now
    )
      return null;
    return payload;
  } catch {
    return null;
  }
}
