import { createClient } from "@/lib/supabase/client";
import { authApi } from "@/lib/supabase/auth-api";
import type { Json, Tables } from "@/types/database";
type Result<T> = { data: T | null; error: string | null };
const fail = <T>(m = "Bakiye işlemi tamamlanamadı."): Result<T> => ({
  data: null,
  error: m,
});
export async function validateGiftCard(code: string): Promise<
  Result<{
    valid: boolean;
    title?: string;
    balance?: number;
    currency?: string;
  }>
> {
  const db = createClient();
  if (!db) return fail();
  const r = await db.rpc("validate_gift_card", {
    p_code: code.trim().toUpperCase(),
  });
  if (r.error || !r.data || typeof r.data !== "object" || Array.isArray(r.data))
    return fail("Hediye kartı doğrulanamadı.");
  const x = r.data as Record<string, Json | undefined>;
  return {
    data: {
      valid: x.valid === true,
      title: typeof x.title === "string" ? x.title : undefined,
      balance: typeof x.balance === "number" ? x.balance : undefined,
      currency: typeof x.currency === "string" ? x.currency : undefined,
    },
    error: null,
  };
}
type MyCredits = {
  account: Tables<"store_credit_accounts"> | null;
  storeTransactions: Tables<"store_credit_transactions">[];
  giftTransactions: Tables<"gift_card_transactions">[];
};
export async function getMyCredits(): Promise<Result<MyCredits>> {
  const db = createClient();
  if (!db) return fail<MyCredits>();
  const user = (await authApi(db).getSession()).data.session?.user;
  if (!user) return fail("Bakiyenizi görmek için giriş yapın.");
  const [a, s, g] = await Promise.all([
    db
      .from("store_credit_accounts")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle(),
    db
      .from("store_credit_transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100),
    db
      .from("gift_card_transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  if (a.error || s.error || g.error) return fail();
  return {
    data: {
      account: a.data,
      storeTransactions: s.data,
      giftTransactions: g.data,
    },
    error: null,
  };
}
export async function getAdminGiftCards(): Promise<
  Result<Tables<"gift_cards">[]>
> {
  const db = createClient();
  if (!db) return fail<Tables<"gift_cards">[]>();
  const r = await db
    .from("gift_cards")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
  return r.error ? fail() : { data: r.data, error: null };
}
export async function createGiftCard(
  payload: Record<string, Json | undefined>,
) {
  const db = createClient();
  if (!db) return fail<string>();
  const r = await db.rpc("create_gift_card", { p_payload: payload });
  return r.error ? fail<string>() : { data: r.data, error: null };
}
export async function updateGiftCard(
  id: string,
  action: "deactivate" | "topup",
  amount = 0,
) {
  const db = createClient();
  if (!db) return fail<boolean>();
  const r = await db.rpc("admin_update_gift_card", {
    p_card_id: id,
    p_action: action,
    p_amount: amount,
  });
  return r.error ? fail<boolean>() : { data: r.data, error: null };
}
export async function refundToStoreCredit(
  orderId: string,
  returnId: string,
  amount: number,
) {
  const db = createClient();
  if (!db) return fail<number>();
  const r = await db.rpc("refund_store_credit", {
    p_order_id: orderId,
    p_amount: amount,
    p_reason: "RMA store credit refund",
    p_return_id: returnId,
  });
  return r.error
    ? fail<number>("Store credit iadesi tamamlanamadı.")
    : { data: r.data, error: null };
}
