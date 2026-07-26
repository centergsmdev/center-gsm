import { createClient } from "@/lib/supabase/client";
import type {
  Json,
  Tables,
  TablesInsert,
  TablesUpdate,
} from "@/types/database";
import type { CreateShipmentInput, ShippingStatus } from "../types";
import { packageToJson } from "../mapper/shipment-mapper";
export type ShipmentDetail = {
  shipment: Tables<"shipments">;
  carrier: Tables<"shipping_carriers"> | null;
  items: (Tables<"shipment_items"> & {
    orderItem: Tables<"order_items"> | null;
  })[];
  events: Tables<"shipment_events">[];
  order: Tables<"orders"> | null;
};
export type ShippingResult<T> = { data: T | null; error: string | null };
const unavailable = "Supabase bağlantısı yapılandırılmamış.";
const safe = "Gönderi bilgileri işlenemedi.";
export async function getAdminShippingCarriers(): Promise<
  ShippingResult<Tables<"shipping_carriers">[]>
> {
  const c = createClient();
  if (!c) return { data: null, error: unavailable };
  const r = await c
    .from("shipping_carriers")
    .select("*")
    .order("is_default", { ascending: false })
    .order("name");
  return r.error ? { data: null, error: safe } : { data: r.data, error: null };
}
export async function getActiveShippingCarriers() {
  const r = await getAdminShippingCarriers();
  return r.data ? { data: r.data.filter((x) => x.is_active), error: null } : r;
}
export async function createAdminShippingCarrier(
  v: TablesInsert<"shipping_carriers">,
) {
  const c = createClient();
  if (!c) return { data: null, error: unavailable };
  const r = await c.from("shipping_carriers").insert(v).select().single();
  return r.error
    ? {
        data: null,
        error: r.error.message.includes("duplicate")
          ? "Kargo kodu veya sağlayıcı anahtarı kullanılıyor."
          : safe,
      }
    : { data: r.data, error: null };
}
export async function updateAdminShippingCarrier(
  id: string,
  v: TablesUpdate<"shipping_carriers">,
) {
  const c = createClient();
  if (!c) return { data: null, error: unavailable };
  const r = await c
    .from("shipping_carriers")
    .update(v)
    .eq("id", id)
    .select()
    .single();
  return r.error ? { data: null, error: safe } : { data: r.data, error: null };
}
export const deactivateAdminShippingCarrier = (id: string) =>
  updateAdminShippingCarrier(id, { is_active: false, is_default: false });
export async function setDefaultShippingCarrier(id: string) {
  const c = createClient();
  if (!c) return { data: null, error: unavailable };
  const r = await c.rpc("set_default_shipping_carrier", { p_carrier_id: id });
  return r.error || !r.data
    ? { data: null, error: safe }
    : { data: true, error: null };
}
export async function getAdminShipments() {
  const c = createClient();
  if (!c) return { data: null, error: unavailable };
  const r = await c
    .from("shipments")
    .select("*")
    .order("created_at", { ascending: false });
  return r.error ? { data: null, error: safe } : { data: r.data, error: null };
}
export async function getOrderShipments(orderId: string) {
  const c = createClient();
  if (!c) return { data: null, error: unavailable };
  const r = await c
    .from("shipments")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at");
  return r.error ? { data: null, error: safe } : { data: r.data, error: null };
}
export async function getAdminShipment(
  id: string,
): Promise<ShippingResult<ShipmentDetail>> {
  const c = createClient();
  if (!c) return { data: null, error: unavailable };
  const s = await c.from("shipments").select("*").eq("id", id).maybeSingle();
  if (s.error || !s.data) return { data: null, error: s.error ? safe : null };
  const [carrier, items, events, order] = await Promise.all([
    c
      .from("shipping_carriers")
      .select("*")
      .eq("id", s.data.carrier_id)
      .maybeSingle(),
    c.from("shipment_items").select("*").eq("shipment_id", id),
    c
      .from("shipment_events")
      .select("*")
      .eq("shipment_id", id)
      .order("event_time"),
    c.from("orders").select("*").eq("id", s.data.order_id).maybeSingle(),
  ]);
  if (carrier.error || items.error || events.error || order.error)
    return { data: null, error: safe };
  const orderItems = await c
    .from("order_items")
    .select("*")
    .in(
      "id",
      items.data.map((x) => x.order_item_id),
    );
  if (orderItems.error) return { data: null, error: safe };
  return {
    data: {
      shipment: s.data,
      carrier: carrier.data,
      items: items.data.map((x) => ({
        ...x,
        orderItem:
          orderItems.data.find((y) => y.id === x.order_item_id) ?? null,
      })),
      events: events.data,
      order: order.data,
    },
    error: null,
  };
}
const rpcError = (message?: string) =>
  message?.includes("quantity_exceeded")
    ? "Seçilen ürün adedi sipariş miktarını aşıyor."
    : message?.includes("no_items")
      ? "Bu sipariş için gönderilebilecek ürün bulunmuyor."
      : message?.includes("inactive_carrier")
        ? "Kargo firması aktif değil."
        : message?.includes("duplicate_tracking")
          ? "Takip numarası başka bir gönderide kullanılıyor."
          : message?.includes("delivered_locked")
            ? "Teslim edilmiş gönderi değiştirilemez."
            : safe;
export async function createManualShipment(v: CreateShipmentInput) {
  const c = createClient();
  if (!c) return { data: null, error: unavailable };
  const r = await c.rpc("create_manual_shipment", {
    p_order_id: v.orderId,
    p_carrier_id: v.carrierId,
    p_items: v.items.map((x) => ({
      order_item_id: x.orderItemId,
      quantity: x.quantity,
    })) as Json,
    p_tracking_number: v.trackingNumber || null,
    p_estimated_delivery_at: v.estimatedDeliveryAt || null,
    p_package: packageToJson(v.package),
    p_shipping_cost: v.shippingCost,
    p_admin_note: v.adminNote || null,
  });
  return r.error
    ? { data: null, error: rpcError(r.error.message) }
    : { data: r.data, error: null };
}
export async function updateShipmentStatus(
  id: string,
  status: ShippingStatus,
  description = "",
  location = "",
) {
  const c = createClient();
  if (!c) return { data: null, error: unavailable };
  const r = await c.rpc("update_shipment_status", {
    p_shipment_id: id,
    p_status: status,
    p_description: description,
    p_location: location,
  });
  return r.error || !r.data
    ? { data: null, error: rpcError(r.error?.message) }
    : { data: true, error: null };
}
export const cancelShipment = (id: string) =>
  updateShipmentStatus(
    id,
    "cancelled",
    "Gönderi admin tarafından iptal edildi.",
  );
export async function updateShipmentTracking(
  id: string,
  carrierId: string,
  trackingNumber: string,
  estimated?: string,
  note = "",
) {
  const c = createClient();
  if (!c) return { data: null, error: unavailable };
  const r = await c.rpc("update_shipment_tracking", {
    p_shipment_id: id,
    p_carrier_id: carrierId,
    p_tracking_number: trackingNumber,
    p_estimated_delivery_at: estimated || null,
    p_admin_note: note,
  });
  return r.error || !r.data
    ? { data: null, error: rpcError(r.error?.message) }
    : { data: true, error: null };
}
export async function addManualShipmentEvent(
  id: string,
  title: string,
  description: string,
  location: string,
) {
  const c = createClient();
  if (!c) return { data: null, error: unavailable };
  const r = await c.rpc("add_manual_shipment_event", {
    p_shipment_id: id,
    p_title: title,
    p_description: description,
    p_location: location,
    p_event_time: null,
  });
  return r.error || !r.data
    ? { data: null, error: safe }
    : { data: true, error: null };
}
export async function updateShippingExperience(
  id: string,
  values: {
    isActive: boolean;
    isDefault: boolean;
    estimatedDays: number;
    freeLabel: string;
    description: string;
    logoUrl: string;
  },
) {
  const c = createClient();
  if (!c) return { data: null, error: unavailable };
  const r = await c.rpc("admin_update_shipping_experience", {
    p_carrier_id: id,
    p_is_active: values.isActive,
    p_is_default: values.isDefault,
    p_estimated_days: values.estimatedDays,
    p_free_label: values.freeLabel,
    p_description: values.description,
    p_logo_url: values.logoUrl,
  });
  return r.error || !r.data
    ? { data: null, error: safe }
    : { data: true, error: null };
}
export async function updateManualShipmentExperience(values: {
  shipmentId: string;
  carrierId: string;
  trackingNumber: string;
  trackingUrl: string;
  shippingNote: string;
  estimatedAt: string;
  status: string;
}) {
  const c = createClient();
  if (!c) return { data: null, error: unavailable };
  const r = await c.rpc("admin_update_manual_shipment", {
    p_shipment_id: values.shipmentId,
    p_carrier_id: values.carrierId,
    p_tracking_number: values.trackingNumber,
    p_tracking_url: values.trackingUrl,
    p_shipping_note: values.shippingNote,
    p_estimated_at: values.estimatedAt,
    p_status: values.status,
  });
  return r.error || !r.data
    ? { data: null, error: safe }
    : { data: true, error: null };
}
