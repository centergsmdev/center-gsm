import { createClient } from "@/lib/supabase/client";
import type { AdminProductResult } from "@/types/admin-product";
import type {
  AdminOrder,
  OrderDetail,
  OrderPaymentStatus,
  OrderStatus,
} from "@/types/order-management";
import type { Json } from "@/types/database";
import { PAYMENT_RECEIPTS_BUCKET } from "@/lib/payment-receipts/client";

const SAFE_ERROR =
  "Sipariş bilgileri işlenemedi. Yetkinizi ve bağlantınızı kontrol edin.";
const addressObject = (value: Json): Record<string, Json | undefined> =>
  value && typeof value === "object" && !Array.isArray(value) ? value : {};
export async function getAdminOrders(): Promise<
  AdminProductResult<AdminOrder[]>
> {
  const client = createClient();
  if (!client)
    return { data: null, error: "Supabase bağlantısı yapılandırılmamış." };
  const [orders, items] = await Promise.all([
    client.from("orders").select("*").order("created_at", { ascending: false }),
    client.from("order_items").select("order_id,quantity"),
  ]);
  if (orders.error || items.error) return { data: null, error: SAFE_ERROR };
  return {
    data: orders.data.map((order) => {
      const address = addressObject(order.delivery_address);
      return {
        ...order,
        customerName:
          `${String(address.firstName ?? "")} ${String(address.lastName ?? "")}`.trim() ||
          "Misafir müşteri",
        email: String(address.email ?? ""),
        itemCount: items.data
          .filter((item) => item.order_id === order.id)
          .reduce((sum, item) => sum + item.quantity, 0),
      };
    }),
    error: null,
  };
}
export async function getAdminOrder(
  id: string,
): Promise<AdminProductResult<OrderDetail | null>> {
  const client = createClient();
  if (!client)
    return { data: null, error: "Supabase bağlantısı yapılandırılmamış." };
  const [order, items] = await Promise.all([
    client.from("orders").select("*").eq("id", id).maybeSingle(),
    client
      .from("order_items")
      .select("*")
      .eq("order_id", id)
      .order("created_at"),
  ]);
  if (order.error || items.error) return { data: null, error: SAFE_ERROR };
  if (!order.data) return { data: null, error: null };
  return { data: { order: order.data, items: items.data }, error: null };
}
export async function updateAdminOrder(
  id: string,
  status: OrderStatus,
  paymentStatus: OrderPaymentStatus,
  note: string,
  restoreStock: boolean,
): Promise<AdminProductResult<true>> {
  const client = createClient();
  if (!client)
    return { data: null, error: "Supabase bağlantısı yapılandırılmamış." };
  const result = await client.rpc("admin_update_order", {
    p_order_id: id,
    p_status: status,
    p_payment_status: paymentStatus,
    p_note: note,
    p_restore_stock: restoreStock,
  });
  return result.error || !result.data
    ? { data: null, error: SAFE_ERROR }
    : { data: true, error: null };
}
export async function updateManualPayment(
  id: string,
  action: "paid" | "rejected" | "unreachable" | "waiting",
  note = "",
): Promise<AdminProductResult<true>> {
  const client = createClient();
  if (!client)
    return { data: null, error: "Supabase bağlantısı yapılandırılmamış." };
  const result = await client.rpc("admin_update_manual_payment", {
    p_order_id: id,
    p_action: action,
    p_note: note,
  });
  return result.error || !result.data
    ? { data: null, error: SAFE_ERROR }
    : { data: true, error: null };
}
export async function deleteAdminOrder(
  id: string,
  orderNumber: string,
): Promise<{ data: true | null; error: string | null }> {
  const client = createClient();
  if (!client)
    return { data: null, error: "Supabase bağlantısı yapılandırılmamış." };
  const result = await client.rpc("admin_hard_delete_order", {
    p_order_id: id,
    p_order_number: orderNumber,
  });
  if (result.error || !result.data || typeof result.data !== "object")
    return {
      data: null,
      error:
        "Sipariş silinemedi. Yetkinizi ve sipariş numarasını kontrol edin.",
    };

  const payload = result.data as Record<string, Json | undefined>;
  const receiptPaths = Array.isArray(payload.receipt_paths)
    ? payload.receipt_paths.filter(
        (path): path is string => typeof path === "string",
      )
    : [];
  const returnPaths = Array.isArray(payload.return_attachment_paths)
    ? payload.return_attachment_paths.filter(
        (path): path is string => typeof path === "string",
      )
    : [];
  const removals = await Promise.all([
    receiptPaths.length
      ? client.storage.from(PAYMENT_RECEIPTS_BUCKET).remove(receiptPaths)
      : Promise.resolve({ error: null }),
    returnPaths.length
      ? client.storage.from("return-attachments").remove(returnPaths)
      : Promise.resolve({ error: null }),
  ]);
  if (removals.some((item) => item.error))
    return {
      data: true,
      error: "Sipariş silindi ancak bazı özel dosyalar temizlenemedi.",
    };
  return { data: true, error: null };
}
export const parseOrderAddress = (value: Json) => addressObject(value);
export const parseOrderHistory = (
  value: Json,
): { status: string; label: string; at: string }[] =>
  Array.isArray(value)
    ? value.flatMap((entry) =>
        entry &&
        typeof entry === "object" &&
        !Array.isArray(entry) &&
        typeof entry.status === "string" &&
        typeof entry.label === "string" &&
        typeof entry.at === "string"
          ? [{ status: entry.status, label: entry.label, at: entry.at }]
          : [],
      )
    : [];
