import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/database";
export type GatewayResult<T> = { data: T | null; error: string | null };
const unavailable = "Supabase bağlantısı yapılandırılmamış.";
const safe = "Kargo işlemi tamamlanamadı.";
export async function getShippingProviderSettings(): Promise<
  GatewayResult<
    (Tables<"shipping_provider_settings"> & {
      carrier: Tables<"shipping_carriers"> | null;
    })[]
  >
> {
  const db = createClient();
  if (!db) return { data: null, error: unavailable };
  const [settings, carriers] = await Promise.all([
    db.from("shipping_provider_settings").select("*").order("provider_key"),
    db.from("shipping_carriers").select("*"),
  ]);
  if (settings.error || carriers.error) return { data: null, error: safe };
  return {
    data: settings.data.map((item) => ({
      ...item,
      carrier:
        carriers.data.find((carrier) => carrier.id === item.carrier_id) ?? null,
    })),
    error: null,
  };
}
export async function updateShippingProvider(
  id: string,
  active: boolean,
  environment: "sandbox" | "production",
) {
  const db = createClient();
  if (!db) return { data: null, error: unavailable };
  const result = await db.rpc("admin_update_shipping_provider", {
    p_id: id,
    p_active: active,
    p_environment: environment,
  });
  return result.error
    ? { data: null, error: safe }
    : { data: result.data, error: null };
}
export async function getShippingWebhooks(
  page = 1,
  filters?: {
    provider?: string;
    status?: string;
    signature?: string;
    tracking?: string;
  },
) {
  const db = createClient();
  if (!db) return { data: null, error: unavailable };
  const from = (page - 1) * 25;
  let query = db
    .from("shipping_webhooks")
    .select("*", { count: "exact" })
    .order("received_at", { ascending: false });
  if (filters?.provider) query = query.eq("provider_key", filters.provider);
  if (filters?.status) {
    const statuses = [
      "received",
      "processing",
      "processed",
      "failed",
      "ignored",
    ] as const;
    const status = statuses.find((value) => value === filters.status);
    if (status) query = query.eq("status", status);
  }
  if (filters?.signature)
    query = query.eq("signature_valid", filters.signature === "valid");
  if (filters?.tracking)
    query = query.ilike("tracking_number", `%${filters.tracking}%`);
  const result = await query.range(from, from + 24);
  return result.error
    ? { data: null, error: safe }
    : { data: { items: result.data, total: result.count ?? 0 }, error: null };
}
export async function getShippingSyncJobs(page = 1) {
  const db = createClient();
  if (!db) return { data: null, error: unavailable };
  const from = (page - 1) * 25;
  const result = await db
    .from("shipping_sync_jobs")
    .select("*", { count: "exact" })
    .order("scheduled_at", { ascending: false })
    .range(from, from + 24);
  return result.error
    ? { data: null, error: safe }
    : { data: { items: result.data, total: result.count ?? 0 }, error: null };
}
export async function retryShippingJob(id: string) {
  const db = createClient();
  if (!db) return { data: null, error: unavailable };
  const result = await db.rpc("admin_retry_shipping_job", { p_job_id: id });
  return result.error || !result.data
    ? { data: null, error: safe }
    : { data: true, error: null };
}
export async function cancelProviderShipment(id: string) {
  const db = createClient();
  if (!db) return { data: null, error: unavailable };
  const result = await db.rpc("admin_cancel_provider_shipment", {
    p_shipment_id: id,
  });
  return result.error || !result.data
    ? { data: null, error: safe }
    : { data: true, error: null };
}
