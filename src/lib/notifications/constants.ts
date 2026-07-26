export const NOTIFICATION_PAGE_SIZE = 25;
export const NOTIFICATION_SAFE_ERROR =
  "Bildirim işlemi tamamlanamadı. Lütfen tekrar deneyin.";
export const NOTIFICATION_NOT_CONFIGURED =
  "Supabase bağlantısı yapılandırılmamış.";
export const TEMPLATE_PLACEHOLDERS = [
  "customer_name",
  "order_number",
  "tracking_number",
  "product_name",
  "total_amount",
  "company_name",
] as const;
