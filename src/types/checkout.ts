export type InvoiceType = "individual" | "corporate";
export type DeliveryMethod = "standard" | "express" | "store";
export type PaymentMethod = "transfer" | "phone_approval";

export type DemoOrder = {
  orderNumber: string;
  createdAt: string;
  customerName: string;
  addressSummary: string;
  deliveryLabel: string;
  estimatedDelivery: string;
  lines: {
    id: string;
    slug: string;
    name: string;
    quantity: number;
    lineTotal: number;
    variantLabel?: string;
    sku?: string;
  }[];
  subtotal: number;
  discount: number;
  shipping: number;
  vat: number;
  total: number;
};
