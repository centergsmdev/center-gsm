export const CRM_PAGE_SIZE = 25;
export const CRM_SAFE_ERROR = "Müşteri bilgileri şu anda işlenemiyor.";
export const CRM_NOT_CONFIGURED = "Supabase bağlantısı yapılandırılmamış.";
export const CUSTOMER_SEGMENTS = [
  "new",
  "active",
  "vip",
  "inactive",
  "blocked",
] as const;
export const CUSTOMER_STATUSES = ["active", "inactive", "blocked"] as const;
export type CustomerSegment = (typeof CUSTOMER_SEGMENTS)[number];
export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];
export const SEGMENT_LABELS: Record<CustomerSegment, string> = {
  new: "Yeni",
  active: "Aktif",
  vip: "VIP",
  inactive: "Pasif",
  blocked: "Engelli",
};
