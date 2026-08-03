import { createClient } from "@/lib/supabase/client";
import { PAYMENT_RECEIPTS_BUCKET } from "@/lib/payment-receipts/client";
import type { AdminProductResult } from "@/types/admin-product";
import type { Tables } from "@/types/database";

export type AdminPaymentReceipt = Tables<"payment_receipts"> & {
  orderNumber: string;
  customerName: string;
  total: number;
};

const safeError = "Dekont bilgileri yüklenemedi. Lütfen tekrar deneyin.";

export async function getAdminPaymentReceipts(): Promise<
  AdminProductResult<AdminPaymentReceipt[]>
> {
  const client = createClient();
  if (!client) return { data: null, error: safeError };
  const receipts = await client
    .from("payment_receipts")
    .select("*")
    .order("created_at", { ascending: false });
  if (receipts.error) return { data: null, error: safeError };
  const orderIds = receipts.data.map((item) => item.order_id);
  if (!orderIds.length) return { data: [], error: null };
  const orders = await client
    .from("orders")
    .select("id,order_number,delivery_address,grand_total")
    .in("id", orderIds);
  if (orders.error) return { data: null, error: safeError };
  const orderMap = new Map(orders.data.map((order) => [order.id, order]));
  return {
    data: receipts.data.map((receipt) => {
      const order = orderMap.get(receipt.order_id);
      const address =
        order?.delivery_address &&
        typeof order.delivery_address === "object" &&
        !Array.isArray(order.delivery_address)
          ? order.delivery_address
          : {};
      return {
        ...receipt,
        orderNumber: order?.order_number ?? "—",
        customerName:
          `${String(address.firstName ?? "")} ${String(address.lastName ?? "")}`.trim() ||
          "Müşteri",
        total: order?.grand_total ?? 0,
      };
    }),
    error: null,
  };
}

export async function getPaymentReceiptUrl(
  path: string,
): Promise<AdminProductResult<string>> {
  const client = createClient();
  if (!client) return { data: null, error: safeError };
  const result = await client.storage
    .from(PAYMENT_RECEIPTS_BUCKET)
    .createSignedUrl(path, 300);
  return result.error
    ? { data: null, error: "Dekont açılamadı." }
    : { data: result.data.signedUrl, error: null };
}
