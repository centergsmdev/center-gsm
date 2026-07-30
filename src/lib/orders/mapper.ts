import type { OrderDetail } from "@/types/order-management";
import type { TrackedOrder, OrderStage } from "@/types/order-tracking";
import type { Json } from "@/types/database";

const record = (value: Json): Record<string, Json | undefined> =>
  value && typeof value === "object" && !Array.isArray(value) ? value : {};
export function mapOrderDetail(detail: OrderDetail): TrackedOrder {
  const delivery = record(detail.order.delivery_address);
  const billing = record(detail.order.billing_address);
  const stage = (
    [
      "received",
      "paid",
      "preparing",
      "shipped",
      "delivered",
      "cancelled",
    ] as string[]
  ).includes(detail.order.status)
    ? (detail.order.status as OrderStage)
    : "received";
  const campaignSnapshots = Array.isArray(detail.order.campaign_snapshots)
    ? detail.order.campaign_snapshots
    : [];
  const couponSnapshot = detail.order.coupon_snapshot
    ? record(detail.order.coupon_snapshot)
    : {};
  return {
    orderNumber: detail.order.order_number,
    orderDate: new Intl.DateTimeFormat("tr-TR", {
      dateStyle: "long",
      timeStyle: "short",
    }).format(new Date(detail.order.created_at)),
    stage,
    paymentMethod:
      detail.order.payment_method === "transfer"
        ? "Havale / EFT"
        : "Online Kart ile Öde (Telefon ile Onay)",
    deliveryMethod:
      detail.order.delivery_method === "express"
        ? "Hızlı teslimat"
        : detail.order.delivery_method === "store"
          ? "Mağazadan teslim"
          : "Standart teslimat",
    customerName:
      `${String(delivery.firstName ?? "")} ${String(delivery.lastName ?? "")}`.trim(),
    contact: String(delivery.email ?? delivery.phone ?? ""),
    deliveryAddress: `${String(delivery.address ?? "")}, ${String(delivery.neighborhood ?? "")}, ${String(delivery.district ?? "")}/${String(delivery.city ?? "")}`,
    invoice: {
      type: billing.type === "corporate" ? "Kurumsal" : "Bireysel",
      name: String(
        billing.companyName ??
          `${String(billing.firstName ?? "")} ${String(billing.lastName ?? "")}`,
      ),
      address: billing.sameAddress
        ? "Teslimat adresi ile aynı"
        : String(billing.companyAddress ?? ""),
    },
    items: detail.items.map((item) => {
      const snapshot = record(item.product_snapshot);
      return {
        id: item.sku,
        slug: String(snapshot.slug ?? "urun"),
        name: item.product_name,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        sku: item.sku,
        variantLabel:
          [
            typeof snapshot.color_name === "string"
              ? snapshot.color_name
              : null,
            typeof snapshot.storage_value === "number" &&
            typeof snapshot.storage_unit === "string"
              ? `${snapshot.storage_value} ${snapshot.storage_unit}`
              : null,
          ]
            .filter(Boolean)
            .join(" · ") || undefined,
      };
    }),
    subtotal: detail.order.subtotal,
    discount: detail.order.discount_total,
    appliedDiscounts: [
      ...campaignSnapshots.flatMap((entry) => {
        const value = record(entry);
        return typeof value.name === "string"
          ? [`Kampanya: ${value.name}`]
          : [];
      }),
      ...(typeof couponSnapshot.code === "string"
        ? [`Kupon: ${couponSnapshot.code}`]
        : []),
    ],
    shipping: detail.order.shipping_total,
    vat: detail.order.tax_total,
    total: detail.order.grand_total,
    cargo: {
      company: detail.order.selected_shipping_name ?? "Henüz atanmadı",
      trackingNumber: "Henüz oluşturulmadı",
      trackingUrl: null,
      status: detail.order.fulfillment_status,
      estimatedDelivery: detail.order.estimated_delivery_days
        ? `${detail.order.estimated_delivery_days} iş günü`
        : "Sipariş durumuna göre güncellenecek",
      events: [],
    },
    shipments: (detail.shipments ?? []).map((shipment) => {
      const carrier = record(shipment.carrier_snapshot);
      return {
        id: shipment.id,
        number: shipment.shipment_number,
        carrier: String(carrier.name ?? "Kargo"),
        trackingNumber: shipment.tracking_number,
        trackingUrl: shipment.tracking_url,
        status: shipment.status,
        shippedAt: shipment.shipped_at,
        estimatedAt: shipment.estimated_delivery_at,
        deliveredAt: shipment.delivered_at,
        items: shipment.items.map((item) => ({
          name: item.product_name ?? "Ürün",
          quantity: item.quantity,
        })),
        events: shipment.events.map((event) => ({
          date: event.event_time,
          location: event.location ?? "",
          description: event.title,
        })),
      };
    }),
  };
}
