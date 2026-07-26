import { getDefaultPaymentAccount } from "@/payment/repository/payment-repository";
import type { PaymentOperationResult, PaymentProvider, PaymentRequest } from "@/payment/types";
const unsupported = (message: string): PaymentOperationResult => ({ success: false, status: "failed", provider: "manual_bank_transfer", message });
export class ManualBankTransferProvider implements PaymentProvider {
  readonly id = "manual_bank_transfer" as const;
  async initialize(request: PaymentRequest): Promise<PaymentOperationResult> { const account = await getDefaultPaymentAccount(); if (account.error || !account.data) return unsupported("Aktif banka hesabı bulunamadı."); return { success: true, status: "awaiting_payment", provider: this.id, reference: request.orderNumber, message: `${account.data.bankName} hesabına havale bekleniyor.` }; }
  async verify(reference: string): Promise<PaymentOperationResult> { return { success: true, status: "awaiting_payment", provider: this.id, reference }; }
  async cancel(): Promise<PaymentOperationResult> { return unsupported("Manuel havale iptali admin onayı gerektirir."); }
  async refund(): Promise<PaymentOperationResult> { return unsupported("Manuel havale iadesi admin işlemi gerektirir."); }
}
