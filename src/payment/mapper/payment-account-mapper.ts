import type { PaymentAccount } from "@/payment/types";
import type { Tables } from "@/types/database";
export const mapPaymentAccount = (row: Tables<"payment_accounts">): PaymentAccount => ({ id: row.id, provider: row.provider, bankName: row.bank_name, accountHolder: row.account_holder, iban: row.iban, branch: row.branch, description: row.description, isActive: row.is_active, isDefault: row.is_default });
