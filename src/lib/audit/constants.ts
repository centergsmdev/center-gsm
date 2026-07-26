export const AUDIT_PAGE_SIZE = 25;
export const AUDIT_SAFE_ERROR = "Denetim kayıtları şu anda görüntülenemiyor.";
export const AUDIT_NOT_CONFIGURED = "Supabase bağlantısı yapılandırılmamış.";

export const AUDIT_ENTITY_TYPES = [
  "product",
  "category",
  "brand",
  "campaign",
  "coupon",
  "order",
  "shipment",
  "inventory",
  "warehouse",
  "user",
  "settings",
  "payment",
  "system",
] as const;

export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[number];
