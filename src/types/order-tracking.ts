export type OrderStage =
  "received" | "paid" | "preparing" | "shipped" | "delivered" | "cancelled";

export type TrackedOrder = {
  orderNumber: string;
  orderDate: string;
  stage: OrderStage;
  paymentMethod: string;
  deliveryMethod: string;
  customerName: string;
  contact: string;
  deliveryAddress: string;
  invoice: { type: string; name: string; address: string };
  items: {
    id: string;
    slug: string;
    name: string;
    quantity: number;
    unitPrice: number;
  }[];
  subtotal: number;
  discount: number;
  appliedDiscounts: string[];
  shipping: number;
  vat: number;
  total: number;
  cargo: {
    company: string;
    trackingNumber: string;
    trackingUrl?: string | null;
    status?: string;
    estimatedDelivery: string;
    events: { date: string; location: string; description: string }[];
  };
  shipments?: {
    id: string;
    number: string;
    carrier: string;
    trackingNumber: string | null;
    trackingUrl: string | null;
    status: string;
    shippedAt: string | null;
    estimatedAt: string | null;
    deliveredAt: string | null;
    items: { name: string; quantity: number }[];
    events: { date: string; location: string; description: string }[];
  }[];
};
