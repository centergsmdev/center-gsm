import { acceptedResponse, sendMetaServerEvent } from "@/lib/meta/server";
import { metaItemId } from "@/lib/meta/item-id";
import { createServiceClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { orderId, eventId } = (await request.json()) as {
      orderId?: string;
      eventId?: string;
    };
    const client = createServiceClient();
    if (!client || !orderId || !eventId) return acceptedResponse(false);
    const [order, items] = await Promise.all([
      client
        .from("orders")
        .select("id,grand_total")
        .eq("id", orderId)
        .maybeSingle(),
      client
        .from("order_items")
        .select("product_id,variant_id,quantity,unit_price")
        .eq("order_id", orderId),
    ]);
    if (!order.data || order.error || items.error)
      return acceptedResponse(false);
    const contents = (items.data ?? []).flatMap((item) =>
      item.product_id
        ? [
            {
              id: metaItemId(item.product_id, item.variant_id),
              quantity: item.quantity,
              item_price: item.unit_price,
            },
          ]
        : [],
    );
    await sendMetaServerEvent({
      eventName: "Purchase",
      eventId,
      sourceUrl: "https://centergsm.com.tr/siparis-basarili",
      customData: {
        currency: "TRY",
        value: order.data.grand_total,
        content_type: "product",
        content_ids: contents.map((item) => item.id),
        contents,
      },
    });
  } catch {
    return acceptedResponse(false);
  }
  return acceptedResponse();
}
