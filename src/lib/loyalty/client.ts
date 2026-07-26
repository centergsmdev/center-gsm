import { createClient } from "@/lib/supabase/client";
import { authApi } from "@/lib/supabase/auth-api";
import type { Json, Tables } from "@/types/database";
type Result<T> = { data: T | null; error: string | null };
const fail = <T>(
  message = "Sadakat bilgileri şu anda yüklenemedi.",
): Result<T> => ({ data: null, error: message });
type MyLoyalty = {
  account: Tables<"loyalty_accounts"> | null;
  transactions: Tables<"loyalty_transactions">[];
  rule: Tables<"reward_rules"> | null;
};
type AdminLoyalty = {
  accounts: Tables<"loyalty_accounts">[];
  transactions: Tables<"loyalty_transactions">[];
  rules: Tables<"reward_rules">[];
};
export async function getMyLoyalty(): Promise<Result<MyLoyalty>> {
  const db = createClient();
  if (!db) return fail<MyLoyalty>();
  const user = (await authApi(db).getSession()).data.session?.user;
  if (!user) return fail("Puanlarınızı görmek için giriş yapın.");
  const [account, transactions, rule] = await Promise.all([
    db
      .from("loyalty_accounts")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle(),
    db
      .from("loyalty_transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100),
    db
      .from("reward_rules")
      .select("*")
      .eq("rule_type", "purchase")
      .eq("is_active", true)
      .order("priority")
      .limit(1)
      .maybeSingle(),
  ]);
  if (account.error || transactions.error || rule.error) return fail();
  return {
    data: {
      account: account.data,
      transactions: transactions.data,
      rule: rule.data,
    },
    error: null,
  };
}
export async function getAdminLoyalty(): Promise<Result<AdminLoyalty>> {
  const db = createClient();
  if (!db) return fail<AdminLoyalty>();
  const [accounts, transactions, rules] = await Promise.all([
    db
      .from("loyalty_accounts")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(500),
    db
      .from("loyalty_transactions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500),
    db.from("reward_rules").select("*").order("priority"),
  ]);
  if (accounts.error || transactions.error || rules.error) return fail();
  return {
    data: {
      accounts: accounts.data,
      transactions: transactions.data,
      rules: rules.data,
    },
    error: null,
  };
}
export async function adjustPoints(
  userId: string,
  points: number,
  reason: string,
) {
  const db = createClient();
  if (!db) return fail<number>();
  const r = await db.rpc("adjust_loyalty_points", {
    p_user_id: userId,
    p_points: points,
    p_reason: reason,
  });
  return r.error
    ? fail<number>("Puan hareketi tamamlanamadı.")
    : { data: r.data, error: null };
}
export async function saveRewardRule(rule: Partial<Tables<"reward_rules">>) {
  const db = createClient();
  if (!db) return fail<string>();
  const r = await db.rpc("admin_save_reward_rule", {
    p_rule: rule as unknown as Json,
  });
  return r.error
    ? fail<string>("Kural kaydedilemedi.")
    : { data: r.data, error: null };
}
