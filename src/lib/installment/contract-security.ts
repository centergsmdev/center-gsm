import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import sanitizeHtml from "sanitize-html";

const CONTRACT_OFFER_LIFETIME_MS = 2 * 60 * 60 * 1000;
const CONTRACT_VERSION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,39}$/;
const PLACEHOLDER_PATTERN = /{{\s*([a-z_]+)\s*}}/g;
const ALLOWED_PLACEHOLDERS = new Set([
  "customer_name",
  "product_name",
  "variant_name",
  "product_price",
  "application_date",
  "down_payment_rate",
  "down_payment_amount",
  "remaining_principal",
  "finance_charge_rate",
  "finance_charge_amount",
  "installment_count",
  "installment_schedule",
  "total_payable",
]);

const CONTRACT_SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p",
    "br",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "h2",
    "h3",
    "ul",
    "ol",
    "li",
    "blockquote",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
  ],
  allowedAttributes: {
    th: ["colspan", "rowspan"],
    td: ["colspan", "rowspan"],
  },
  allowedSchemes: [],
  disallowedTagsMode: "discard",
};

type ContractOfferPayload = {
  v: 1;
  templateId: string;
  productId: string;
  variantId: string | null;
  contentHash: string;
  presentedAt: string;
  expiresAt: number;
};

export function sanitizeInstallmentContractContent(value: string) {
  return sanitizeHtml(value, CONTRACT_SANITIZE_OPTIONS).trim();
}

export function hashInstallmentContractContent(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function findUnknownInstallmentContractPlaceholders(
  contentHtml: string,
) {
  return Array.from(contentHtml.matchAll(PLACEHOLDER_PATTERN))
    .map((match) => match[1])
    .filter(
      (key, index, values) =>
        !ALLOWED_PLACEHOLDERS.has(key) && values.indexOf(key) === index,
    );
}

export function validateInstallmentContractTemplate(input: {
  title: string;
  version: string;
  contentHtml: string;
}) {
  const title = input.title.trim();
  const version = input.version.trim();
  const contentHtml = sanitizeInstallmentContractContent(input.contentHtml);
  if (title.length < 3 || title.length > 160)
    return { data: null, error: "Sözleşme başlığını kontrol edin." } as const;
  if (!CONTRACT_VERSION_PATTERN.test(version))
    return {
      data: null,
      error:
        "Versiyon yalnız harf, rakam, nokta, tire ve alt çizgi içerebilir.",
    } as const;
  if (contentHtml.length < 100 || contentHtml.length > 100000)
    return { data: null, error: "Sözleşme metnini kontrol edin." } as const;
  const unknown = findUnknownInstallmentContractPlaceholders(contentHtml);
  if (unknown.length)
    return {
      data: null,
      error: `Desteklenmeyen sözleşme alanı: {{${unknown[0]}}}`,
    } as const;
  return { data: { title, version, contentHtml }, error: null } as const;
}

function encodePayload(payload: ContractOfferPayload) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function signPayload(encoded: string, secret: string) {
  return createHmac("sha256", secret).update(encoded).digest("base64url");
}

export function createInstallmentContractOfferToken(
  payload: Omit<ContractOfferPayload, "v" | "expiresAt">,
  secret: string,
  now = Date.now(),
) {
  const encoded = encodePayload({
    ...payload,
    v: 1,
    expiresAt: now + CONTRACT_OFFER_LIFETIME_MS,
  });
  return `${encoded}.${signPayload(encoded, secret)}`;
}

export function verifyInstallmentContractOfferToken(
  token: string,
  expected: { productId: string; variantId: string | null },
  secret: string,
  now = Date.now(),
) {
  const [encoded, signature, extra] = token.split(".");
  if (!encoded || !signature || extra || !secret) return null;
  const calculated = signPayload(encoded, secret);
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
    ) as ContractOfferPayload;
    const presentedAt = Date.parse(payload.presentedAt);
    if (
      payload.v !== 1 ||
      payload.productId !== expected.productId ||
      payload.variantId !== expected.variantId ||
      !Number.isFinite(presentedAt) ||
      presentedAt > now + 5 * 60 * 1000 ||
      !Number.isFinite(payload.expiresAt) ||
      payload.expiresAt < now ||
      !/^[a-f0-9]{64}$/.test(payload.contentHash)
    )
      return null;
    return payload;
  } catch {
    return null;
  }
}

export function contractOfferCanBeUsed(
  offeredTemplateIsActive: boolean,
  hasAnyActiveTemplate: boolean,
) {
  return offeredTemplateIsActive || hasAnyActiveTemplate;
}
