import type { PaymentProviderCode } from "./constants";
import type { GatewayStatus, PaymentResult } from "./types";
export function mapGatewayResult(
  provider: PaymentProviderCode,
  reference: string,
  status: GatewayStatus,
  message?: string,
): PaymentResult {
  return {
    success:
      status === "succeeded" || status === "refunded" || status === "cancelled",
    status,
    provider,
    providerReference: reference,
    message,
  };
}
