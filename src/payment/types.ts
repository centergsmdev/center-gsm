export type PaymentProviderId = "manual_bank_transfer" | "cash_on_delivery" | "iyzico" | "paytr" | "param" | "garanti" | "akbank" | "yapi_kredi" | "qnb";
export type PaymentStatus = "pending" | "awaiting_payment" | "paid" | "failed" | "cancelled" | "refunded";
export type PaymentAccount = { id: string; provider: PaymentProviderId; bankName: string; accountHolder: string; iban: string; branch: string | null; description: string | null; isActive: boolean; isDefault: boolean };
export type PaymentRequest = { orderId: string; orderNumber: string; amount: number; currency: "TRY" };
export type PaymentOperationResult = { success: boolean; status: PaymentStatus; provider: PaymentProviderId; reference?: string; message?: string };
export interface PaymentProvider {
  readonly id: PaymentProviderId;
  initialize(request: PaymentRequest): Promise<PaymentOperationResult>;
  verify(reference: string): Promise<PaymentOperationResult>;
  cancel(reference: string): Promise<PaymentOperationResult>;
  refund(reference: string, amount?: number): Promise<PaymentOperationResult>;
}
