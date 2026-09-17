import { createClient } from "@/lib/supabase/client";
import { PAYMENT_RECEIPTS_BUCKET } from "@/lib/payment-receipts/client";
import type { AdminProductResult } from "@/types/admin-product";
import type { Tables } from "@/types/database";

export type AdminPaymentReceipt = Tables<"payment_receipts"> & {
  orderNumber: string;
  customerName: string;
  total: number;
};

export type AdminInstallmentPaymentReceipt =
  Tables<"installment_payment_receipts"> & {
    applicationNumber: string;
    customerName: string;
    productName: string;
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

export async function getAdminInstallmentPaymentReceipts(): Promise<
  AdminProductResult<AdminInstallmentPaymentReceipt[]>
> {
  try {
    const response = await fetch("/api/admin/installment-payment-receipts", {
      cache: "no-store",
    });
    const body = (await response.json()) as {
      items?: AdminInstallmentPaymentReceipt[];
      error?: string;
    };
    return response.ok && body.items
      ? { data: body.items, error: null }
      : { data: null, error: body.error || safeError };
  } catch {
    return { data: null, error: safeError };
  }
}

export async function reviewAdminInstallmentPaymentReceipt(
  receiptId: string,
  status: "approved" | "rejected",
  rejectionReason?: string,
): Promise<AdminProductResult<true>> {
  try {
    const response = await fetch(
      `/api/admin/installment-payment-receipts/${encodeURIComponent(receiptId)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, rejectionReason }),
      },
    );
    const body = (await response.json()) as { error?: string };
    return response.ok
      ? { data: true, error: null }
      : { data: null, error: body.error || "Dekont kararı kaydedilemedi." };
  } catch {
    return { data: null, error: "Dekont kararı kaydedilemedi." };
  }
}

async function deleteReceipt(
  endpoint: string,
  password: string,
): Promise<AdminProductResult<{ warning: string | null }>> {
  try {
    const response = await fetch(endpoint, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const body = (await response.json()) as {
      error?: string;
      warning?: string | null;
    };
    return response.ok
      ? { data: { warning: body.warning ?? null }, error: null }
      : { data: null, error: body.error || "Dekont silinemedi." };
  } catch {
    return { data: null, error: "Dekont silinemedi." };
  }
}

export const deleteAdminPaymentReceipt = (
  receiptId: string,
  password: string,
) =>
  deleteReceipt(
    `/api/admin/payment-receipts/${encodeURIComponent(receiptId)}`,
    password,
  );

export const deleteAdminInstallmentPaymentReceipt = (
  receiptId: string,
  password: string,
) =>
  deleteReceipt(
    `/api/admin/installment-payment-receipts/${encodeURIComponent(receiptId)}`,
    password,
  );

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
