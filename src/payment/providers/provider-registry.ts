import { ManualBankTransferProvider } from "@/payment/providers/manual-bank-transfer-provider";
import type { PaymentProvider, PaymentProviderId } from "@/payment/types";
const providers = new Map<PaymentProviderId, PaymentProvider>([["manual_bank_transfer", new ManualBankTransferProvider()]]);
export function getPaymentProvider(id: PaymentProviderId) { return providers.get(id) ?? null; }
