export class PaymentGatewayError extends Error {
  constructor(
    public readonly code:
      | "NOT_CONFIGURED"
      | "INVALID_SIGNATURE"
      | "INVALID_PAYLOAD"
      | "PROVIDER_ERROR"
      | "REPLAYED",
    message: string,
  ) {
    super(message);
    this.name = "PaymentGatewayError";
  }
}
