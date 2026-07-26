import { ShippingGatewayError } from "../errors";
import type {
  GatewayShipmentStatus,
  ShippingAddress,
  ShippingPackage,
} from "../types";

export const SHIPPING_WEBHOOK_MAX_BYTES = 256_000;
export const SHIPPING_TIMEOUT_MS = 8_000;
export const SHIPPING_MAX_RETRIES = 3;
export const calculateDesi = (
  lengthCm: number,
  widthCm: number,
  heightCm: number,
  divisor = 3000,
) => Math.ceil(((lengthCm * widthCm * heightCm) / divisor) * 100) / 100;
export function validatePackage(
  input: Omit<ShippingPackage, "desi"> & { desi?: number },
  divisor = 3000,
): ShippingPackage {
  const values = [
    input.lengthCm,
    input.widthCm,
    input.heightCm,
    input.weightKg,
    input.quantity,
  ];
  if (
    values.some((value) => !Number.isFinite(value) || value <= 0) ||
    input.lengthCm > 300 ||
    input.widthCm > 300 ||
    input.heightCm > 300 ||
    input.weightKg > 1000 ||
    input.quantity > 100
  )
    throw new ShippingGatewayError("invalid_package");
  return {
    ...input,
    desi:
      input.desi && input.desi > 0
        ? input.desi
        : calculateDesi(input.lengthCm, input.widthCm, input.heightCm, divisor),
  };
}
export const normalizePhone = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("90")
    ? `+${digits}`
    : digits.startsWith("0")
      ? `+90${digits.slice(1)}`
      : `+90${digits}`;
};
export function normalizeAddress(address: ShippingAddress): ShippingAddress {
  const normalized = {
    ...address,
    fullName: address.fullName.trim(),
    phone: normalizePhone(address.phone),
    countryCode: (address.countryCode || "TR").toUpperCase(),
    city: address.city.trim(),
    district: address.district.trim(),
    neighborhood: address.neighborhood?.trim(),
    addressLine: address.addressLine.trim(),
    postalCode: address.postalCode?.replace(/\D/g, ""),
  };
  if (
    !normalized.fullName ||
    !normalized.city ||
    !normalized.district ||
    normalized.addressLine.length < 10 ||
    normalized.phone.length < 12
  )
    throw new ShippingGatewayError("invalid_address");
  return normalized;
}
export const mapProviderStatus = (raw: string): GatewayShipmentStatus => {
  const key = raw.toLocaleLowerCase("tr-TR").replace(/\s+/g, "_");
  const statuses: Record<string, GatewayShipmentStatus> = {
    pending: "pending",
    created: "created",
    accepted: "accepted",
    preparing: "accepted",
    at_branch: "at_branch",
    in_transit: "in_transit",
    out_for_delivery: "out_for_delivery",
    delivered: "delivered",
    delivery_failed: "delivery_failed",
    return_started: "return_started",
    returned: "returned",
    cancelled: "cancelled",
  };
  return statuses[key] ?? "exception";
};
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
  let difference = 0;
  for (let index = 0; index < left.length; index += 1)
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}
export function assertSafeXml(raw: string) {
  if (/<!DOCTYPE|<!ENTITY|SYSTEM\s+["']|PUBLIC\s+["']/i.test(raw))
    throw new ShippingGatewayError("operation_failed");
  if (!raw.trim().startsWith("<"))
    throw new ShippingGatewayError("operation_failed");
  return raw;
}
export async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs = SHIPPING_TIMEOUT_MS,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<T>((_, reject) => {
        timer = setTimeout(
          () => reject(new ShippingGatewayError("provider_timeout")),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
