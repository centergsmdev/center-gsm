import { mapPaymentAccount } from "@/payment/mapper/payment-account-mapper";
import { createClient } from "@/lib/supabase/client";
import type { PaymentAccount } from "@/payment/types";
export async function getDefaultPaymentAccount(): Promise<{ data: PaymentAccount | null; error: boolean }> {
  const client = createClient(); if (!client) return { data: null, error: false };
  const result = await client.from("payment_accounts").select("*").eq("is_active", true).order("is_default", { ascending: false }).order("created_at").limit(1).maybeSingle();
  return result.error ? { data: null, error: true } : { data: result.data ? mapPaymentAccount(result.data) : null, error: false };
}
