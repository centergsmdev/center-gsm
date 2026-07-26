import type { CatalogProduct } from "@/types/product";

const categorySpecifications: Record<
  CatalogProduct["category"],
  Record<string, string>
> = {
  Telefon: {
    Ekran: "6.7 inç OLED",
    Depolama: "256 GB",
    Bağlantı: "5G / Wi-Fi 6",
  },
  Bilgisayar: {
    Ekran: "Yüksek çözünürlüklü",
    Bellek: "16 GB",
    Depolama: "512 GB SSD",
  },
  Tablet: { Ekran: "11 inç", Depolama: "256 GB", Bağlantı: "Wi-Fi 6" },
  "Akıllı Saat": {
    Ekran: "AMOLED",
    Bağlantı: "Bluetooth",
    Dayanıklılık: "Suya dayanıklı",
  },
  Kulaklık: {
    Bağlantı: "Bluetooth 5.3",
    Özellik: "Aktif gürültü engelleme",
    Pil: "30 saate kadar",
  },
  Aksesuar: {
    Bağlantı: "Evrensel",
    Malzeme: "Premium",
    Uyumluluk: "Çoklu cihaz",
  },
};

export function getProductSpecifications(product: CatalogProduct) {
  return categorySpecifications[product.category];
}

export const specificationLabels = Array.from(
  new Set(
    Object.values(categorySpecifications).flatMap((specs) =>
      Object.keys(specs),
    ),
  ),
);
