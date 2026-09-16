import type { TradeInStatus } from "@/types/database";

export const TRADE_IN_BUCKET = "trade-in-private";
export const TRADE_IN_MIN_PHOTOS = 2;
export const TRADE_IN_MAX_PHOTOS = 4;
export const TRADE_IN_MAX_IMAGE_SIZE = 1024 * 1024;

export const TRADE_IN_STATUS_LABELS: Record<TradeInStatus, string> = {
  new: "Yeni başvuru",
  reviewing: "İnceleniyor",
  offer_sent: "Teklif iletildi",
  accepted: "Teklif kabul edildi",
  rejected: "Uygun bulunmadı",
  completed: "Takas tamamlandı",
  cancelled: "İptal edildi",
};

export const SCREEN_CONDITION_LABELS = {
  clean: "Temiz",
  scratched: "Çizikler var",
  cracked: "Kırık / çatlak",
} as const;

export const BODY_CONDITION_LABELS = {
  clean: "Temiz",
  used: "Kullanım izleri var",
  damaged: "Darbe / kırık var",
} as const;

export const REPAIR_STATUS_LABELS = {
  no: "İşlem görmedi",
  yes: "Onarım gördü",
  unknown: "Bilmiyorum",
} as const;

export const TRADE_IN_BRANDS = [
  "Apple",
  "Samsung",
  "Xiaomi",
  "Huawei",
  "HONOR",
  "OPPO",
  "realme",
  "OnePlus",
  "Google",
  "Diğer",
] as const;

export const TRADE_IN_STORAGE_OPTIONS = [
  "32 GB",
  "64 GB",
  "128 GB",
  "256 GB",
  "512 GB",
  "1 TB",
] as const;
