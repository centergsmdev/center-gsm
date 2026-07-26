export const PAYMENT_PROVIDER_CODES = [
  "mock",
  "iyzico",
  "paytr",
  "param",
] as const;

export type PaymentProviderCode = (typeof PAYMENT_PROVIDER_CODES)[number];

export const PAYMENT_SAFE_ERROR = "Ödeme işlemi şu anda tamamlanamıyor.";
export const PAYMENT_NOT_CONFIGURED = "Ödeme sağlayıcısı yapılandırılmamış.";
export const PAYMENT_WEBHOOK_MAX_BYTES = 256_000;
export const PAYMENT_WEBHOOK_SIGNATURE_HEADER = "x-payment-signature";

export function isPaymentProviderCode(
  value: string,
): value is PaymentProviderCode {
  return PAYMENT_PROVIDER_CODES.some((code) => code === value);
}
