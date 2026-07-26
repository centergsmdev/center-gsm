import type { ReturnReason, ReturnStatus } from "@/types/database";
export const RETURN_REASONS: Record<ReturnReason, string> = {
  wrong_product: "Yanlış Ürün",
  damaged_product: "Hasarlı Ürün",
  missing_product: "Eksik Ürün",
  shipping_damage: "Kargo Hasarı",
  changed_mind: "Ürünü Beğenmedim",
  defective_product: "Arızalı Ürün",
  warranty: "Garanti Talebi",
  other: "Diğer",
};
export const RETURN_STATUSES: Record<ReturnStatus, string> = {
  new: "Yeni",
  reviewing: "İnceleniyor",
  awaiting_photos: "Fotoğraf Bekleniyor",
  approved: "Onaylandı",
  rejected: "Reddedildi",
  awaiting_product: "Ürün Bekleniyor",
  product_received: "Ürün Teslim Alındı",
  inspected: "İncelendi",
  refund_approved: "İade Onaylandı",
  exchange_approved: "Değişim Onaylandı",
  refund_completed: "İade Tamamlandı",
  exchange_completed: "Değişim Tamamlandı",
  cancelled: "İptal Edildi",
};
export const RETURN_ACCEPT =
  "image/jpeg,image/png,image/webp,video/mp4,video/webm,application/pdf";
export const RETURN_MAX_FILE_SIZE = 50 * 1024 * 1024;
