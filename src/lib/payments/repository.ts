import { createClient } from "@/lib/supabase/client";
import { PAYMENT_NOT_CONFIGURED, PAYMENT_SAFE_ERROR } from "./constants";
import type {
  PaymentProviderRow,
  PaymentRefundRow,
  PaymentResultEnvelope,
  PaymentWebhookRow,
} from "./types";
export async function getPaymentProviders(): Promise<
  PaymentResultEnvelope<PaymentProviderRow[]>
> {
  const db = createClient();
  if (!db) return { data: null, error: PAYMENT_NOT_CONFIGURED };
  const result = await db.from("payment_providers").select("*").order("name");
  return result.error
    ? { data: null, error: PAYMENT_SAFE_ERROR }
    : { data: result.data, error: null };
}
export async function updatePaymentProvider(
  id: string,
  isActive: boolean,
  mode: "sandbox" | "production",
): Promise<PaymentResultEnvelope<true>> {
  const db = createClient();
  if (!db) return { data: null, error: PAYMENT_NOT_CONFIGURED };
  const result = await db.rpc("admin_update_payment_provider", {
    p_provider_id: id,
    p_is_active: isActive,
    p_mode: mode,
  });
  return result.error
    ? { data: null, error: PAYMENT_SAFE_ERROR }
    : { data: true, error: null };
}
export async function getPaymentWebhooks(
  page = 1,
): Promise<
  PaymentResultEnvelope<{ items: PaymentWebhookRow[]; total: number }>
> {
  const db = createClient();
  if (!db) return { data: null, error: PAYMENT_NOT_CONFIGURED };
  const from = (page - 1) * 25;
  const result = await db
    .from("payment_webhooks")
    .select("*", { count: "exact" })
    .order("received_at", { ascending: false })
    .range(from, from + 24);
  return result.error
    ? { data: null, error: PAYMENT_SAFE_ERROR }
    : { data: { items: result.data, total: result.count ?? 0 }, error: null };
}
export async function getPaymentRefunds(): Promise<
  PaymentResultEnvelope<PaymentRefundRow[]>
> {
  const db = createClient();
  if (!db) return { data: null, error: PAYMENT_NOT_CONFIGURED };
  const result = await db
    .from("payment_refunds")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  return result.error
    ? { data: null, error: PAYMENT_SAFE_ERROR }
    : { data: result.data, error: null };
}
export async function createPaymentRefund(
  transactionId: string,
  providerId: string,
  amount: number,
  reason: string,
): Promise<PaymentResultEnvelope<string>> {
  const db = createClient();
  if (!db) return { data: null, error: PAYMENT_NOT_CONFIGURED };
  const result = await db.rpc("admin_create_payment_refund", {
    p_transaction_id: transactionId,
    p_provider_id: providerId,
    p_amount: amount,
    p_reason: reason,
  });
  return result.error
    ? { data: null, error: PAYMENT_SAFE_ERROR }
    : { data: result.data, error: null };
}
