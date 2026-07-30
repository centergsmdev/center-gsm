import type { DemoOrder } from "@/types/checkout";
import type { TrackedOrder } from "@/types/order-tracking";

export const DEMO_ORDER_NUMBER = "CG-2026-482731";
export const DEMO_ORDER_CONTACTS = ["demo@centergsm.com", "05551234567"];

export const demoTrackedOrder: TrackedOrder = {
  orderNumber: DEMO_ORDER_NUMBER,
  orderDate: "24 Temmuz 2026, 14:32",
  stage: "shipped",
  paymentMethod: "Kredi kartı · Tek çekim",
  deliveryMethod: "Standart teslimat",
  customerName: "Deniz Yılmaz",
  contact: "demo@centergsm.com",
  deliveryAddress: "Caferağa Mah. Moda Cad. No: 24 D: 6, Kadıköy / İstanbul",
  invoice: {
    type: "Bireysel",
    name: "Deniz Yılmaz",
    address: "Teslimat adresi ile aynı",
  },
  items: [
    {
      id: "p-001",
      slug: "nova-x-pro-256",
      name: "Nova X Pro 256 GB",
      quantity: 1,
      unitPrice: 42999,
    },
    {
      id: "p-002",
      slug: "airsound-max",
      name: "Auralis AirSound Max",
      quantity: 1,
      unitPrice: 8749,
    },
  ],
  subtotal: 60498,
  discount: 8750,
  appliedDiscounts: [],
  shipping: 0,
  vat: 8625,
  total: 51748,
  cargo: {
    company: "CENTER Lojistik",
    trackingNumber: "CLG984216573TR",
    estimatedDelivery: "29 Temmuz 2026",
    events: [
      {
        date: "27 Temmuz · 09:15",
        location: "İstanbul Transfer Merkezi",
        description: "Gönderi transfer merkezine ulaştı.",
      },
      {
        date: "26 Temmuz · 18:40",
        location: "CENTER GSM Depo",
        description: "Paket kargo firmasına teslim edildi.",
      },
      {
        date: "26 Temmuz · 15:10",
        location: "CENTER GSM Depo",
        description: "Sipariş paketlendi.",
      },
    ],
  },
};

export function trackedOrderFromCheckout(order: DemoOrder): TrackedOrder {
  return {
    ...demoTrackedOrder,
    orderNumber: order.orderNumber,
    orderDate: new Intl.DateTimeFormat("tr-TR", {
      dateStyle: "long",
      timeStyle: "short",
    }).format(new Date(order.createdAt)),
    stage: "received",
    paymentMethod: "Demo ödeme yöntemi",
    deliveryMethod: order.deliveryLabel,
    customerName: order.customerName,
    deliveryAddress: order.addressSummary,
    items: order.lines.map((line) => ({
      id: line.id,
      slug: line.slug,
      name: line.name,
      quantity: line.quantity,
      unitPrice: line.lineTotal / line.quantity,
      sku: line.sku,
      variantLabel: line.variantLabel,
    })),
    subtotal: order.subtotal,
    discount: order.discount,
    shipping: order.shipping,
    vat: order.vat,
    total: order.total,
    cargo: {
      ...demoTrackedOrder.cargo,
      trackingNumber: "Henüz oluşturulmadı",
      estimatedDelivery: order.estimatedDelivery,
      events: [
        {
          date: "Şimdi",
          location: "CENTER GSM",
          description: "Demo siparişiniz alındı.",
        },
      ],
    },
  };
}
