import { createClient } from "@/lib/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/database";

type Result<T> = { data: T | null; error: string | null };
const unavailable = "Supabase bağlantısı yapılandırılmamış.";
const safeError = "Ödeme çözüm ortağı işlemi tamamlanamadı.";

async function revalidatePaymentPartners() {
  await fetch("/api/admin/payment-partners/revalidate", {
    method: "POST",
  }).catch(() => undefined);
}

export async function getAdminPaymentPartners(): Promise<
  Result<Tables<"payment_partners">[]>
> {
  const client = createClient();
  if (!client) return { data: null, error: unavailable };

  const result = await client
    .from("payment_partners")
    .select("*")
    .order("is_default", { ascending: false })
    .order("sort_order")
    .order("name");

  if (result.error) return { data: null, error: safeError };
  return { data: result.data, error: null };
}

export async function createAdminPaymentPartner(
  values: TablesInsert<"payment_partners">,
): Promise<Result<Tables<"payment_partners">>> {
  const client = createClient();
  if (!client) return { data: null, error: unavailable };

  const result = await client
    .from("payment_partners")
    .insert(values)
    .select()
    .single();

  if (result.error) return { data: null, error: safeError };
  await revalidatePaymentPartners();
  return { data: result.data, error: null };
}

export async function updateAdminPaymentPartner(
  id: string,
  values: TablesUpdate<"payment_partners">,
): Promise<Result<Tables<"payment_partners">>> {
  const client = createClient();
  if (!client) return { data: null, error: unavailable };

  const result = await client
    .from("payment_partners")
    .update(values)
    .eq("id", id)
    .select()
    .single();

  if (result.error) return { data: null, error: safeError };
  await revalidatePaymentPartners();
  return { data: result.data, error: null };
}

export async function setDefaultPaymentPartner(id: string) {
  const client = createClient();
  if (!client) return { data: null, error: unavailable };

  const result = await client.rpc("set_default_payment_partner", {
    p_partner_id: id,
  });

  if (result.error || !result.data) return { data: null, error: safeError };
  await revalidatePaymentPartners();
  return { data: true, error: null };
}
