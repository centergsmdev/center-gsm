export const AUDIT_ACTIONS = [
  "product_created",
  "product_updated",
  "product_deleted",
  "category_created",
  "category_updated",
  "brand_created",
  "brand_updated",
  "campaign_created",
  "campaign_updated",
  "coupon_created",
  "coupon_updated",
  "order_created",
  "order_updated",
  "payment_updated",
  "shipment_created",
  "shipment_updated",
  "inventory_adjusted",
  "warehouse_updated",
  "user_created",
  "user_updated",
  "admin_login",
  "admin_logout",
  "application.review_started",
  "application.approved",
  "application.rejected",
  "document.viewed",
  "document.downloaded",
] as const;

export type KnownAuditAction = (typeof AUDIT_ACTIONS)[number];
export type AuditAction = KnownAuditAction | (string & {});

export const AUDIT_ACTION_LABELS: Record<KnownAuditAction, string> = {
  product_created: "Ürün oluşturuldu",
  product_updated: "Ürün güncellendi",
  product_deleted: "Ürün pasife alındı",
  category_created: "Kategori oluşturuldu",
  category_updated: "Kategori güncellendi",
  brand_created: "Marka oluşturuldu",
  brand_updated: "Marka güncellendi",
  campaign_created: "Kampanya oluşturuldu",
  campaign_updated: "Kampanya güncellendi",
  coupon_created: "Kupon oluşturuldu",
  coupon_updated: "Kupon güncellendi",
  order_created: "Sipariş oluşturuldu",
  order_updated: "Sipariş güncellendi",
  payment_updated: "Ödeme güncellendi",
  shipment_created: "Kargo oluşturuldu",
  shipment_updated: "Kargo güncellendi",
  inventory_adjusted: "Stok ayarlandı",
  warehouse_updated: "Depo güncellendi",
  user_created: "Kullanıcı oluşturuldu",
  user_updated: "Kullanıcı güncellendi",
  admin_login: "Admin giriş yaptı",
  admin_logout: "Admin çıkış yaptı",
  "application.review_started": "Elden taksit başvurusu incelemeye alındı",
  "application.approved": "Elden taksit başvurusu onaylandı",
  "application.rejected": "Elden taksit başvurusu reddedildi",
  "document.viewed": "Hassas başvuru belgesi görüntülendi",
  "document.downloaded": "Hassas başvuru belgesi indirildi",
};

export function getAuditActionLabel(action: string): string {
  return action in AUDIT_ACTION_LABELS
    ? AUDIT_ACTION_LABELS[action as KnownAuditAction]
    : action.replaceAll("_", " ");
}
