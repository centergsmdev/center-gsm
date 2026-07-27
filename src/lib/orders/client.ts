import { createClient } from "@/lib/supabase/client";
import type { AdminProductResult } from "@/types/admin-product";
import type {
  CreatedOrder,
  OrderCreatePayload,
  OrderDetail,
} from "@/types/order-management";
import type { Json, Tables } from "@/types/database";

const SAFE_ERROR =
  "Sipariş işlemi tamamlanamadı. Lütfen bilgilerinizi kontrol edip tekrar deneyin.";
const object = (
  value: Json | undefined,
): value is Record<string, Json | undefined> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

export async function createOrder(
  payload: OrderCreatePayload,
): Promise<AdminProductResult<CreatedOrder>> {
  const client = createClient();
  if (!client)
    return { data: null, error: "Supabase bağlantısı yapılandırılmamış." };
  const result = await client.rpc("create_order", {
    p_payload: payload as unknown as Json,
  });
  if (result.error) {
    if (process.env.NODE_ENV === "development") {
      const stack = new Error("Supabase create_order RPC failed").stack;
      console.error("[orders/createOrder] Supabase RPC error", {
        error: result.error,
        code: result.error.code,
        message: result.error.message,
        details: result.error.details,
        hint: result.error.hint,
        stack,
      });
    }
    return {
      data: null,
      error: result.error.message.includes("insufficient_inventory")
        ? "Seçtiğiniz ürünlerden biri için yeterli kullanılabilir stok kalmadı. Sepetinizi güncelleyip tekrar deneyin."
        : result.error.message.includes("bank_account_unavailable")
          ? "Havale/EFT şu anda kullanılamıyor. Lütfen telefon ile onay yöntemini seçin."
          : SAFE_ERROR,
    };
  }
  if (!object(result.data)) return { data: null, error: SAFE_ERROR };
  const id = result.data.id;
  const orderNumber = result.data.order_number;
  const total = result.data.grand_total;
  const createdAt = result.data.created_at;
  const subtotal = result.data.subtotal;
  const discountTotal = result.data.discount_total;
  const campaignDiscount = result.data.campaign_discount;
  const couponDiscount = result.data.coupon_discount;
  const loyaltyDiscount = result.data.loyalty_discount;
  const loyaltyPointsRedeemed = result.data.loyalty_points_redeemed;
  const giftCardAmount = result.data.gift_card_amount;
  const storeCreditAmount = result.data.store_credit_amount;
  if (
    typeof id !== "string" ||
    typeof orderNumber !== "string" ||
    typeof total !== "number" ||
    typeof createdAt !== "string" ||
    typeof subtotal !== "number" ||
    typeof discountTotal !== "number" ||
    typeof campaignDiscount !== "number" ||
    typeof couponDiscount !== "number"
  )
    return { data: null, error: SAFE_ERROR };
  return {
    data: {
      id,
      orderNumber,
      grandTotal: total,
      createdAt,
      contact: payload.delivery_address.email,
      subtotal,
      discountTotal,
      campaignDiscount,
      couponDiscount,
      loyaltyDiscount:
        typeof loyaltyDiscount === "number" ? loyaltyDiscount : 0,
      loyaltyPointsRedeemed:
        typeof loyaltyPointsRedeemed === "number" ? loyaltyPointsRedeemed : 0,
      giftCardAmount: typeof giftCardAmount === "number" ? giftCardAmount : 0,
      storeCreditAmount:
        typeof storeCreditAmount === "number" ? storeCreditAmount : 0,
    },
    error: null,
  };
}

export async function getOrderByReference(
  orderNumber: string,
  contact: string,
): Promise<AdminProductResult<OrderDetail | null>> {
  const client = createClient();
  if (!client)
    return { data: null, error: "Supabase bağlantısı yapılandırılmamış." };
  const result = await client.rpc("get_order_by_reference", {
    p_order_number: orderNumber,
    p_contact: contact,
  });
  if (result.error) return { data: null, error: SAFE_ERROR };
  if (!result.data) return { data: null, error: null };
  if (
    !object(result.data) ||
    !object(result.data.order) ||
    !Array.isArray(result.data.items)
  )
    return { data: null, error: SAFE_ERROR };
  return {
    data: {
      order: result.data.order as unknown as Tables<"orders">,
      items: result.data.items as unknown as Tables<"order_items">[],
      shipments: Array.isArray(result.data.shipments)
        ? (result.data.shipments as unknown as NonNullable<
            OrderDetail["shipments"]
          >)
        : [],
    },
    error: null,
  };
}
