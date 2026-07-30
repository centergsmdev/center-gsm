import { catalogProducts } from "@/data/catalog-products";
import type { SupabaseCatalogRow } from "@/lib/catalog/types";
import { calculateMonthlyInstallment } from "@/lib/catalog/installments";
import { plainText } from "@/lib/seo/seo";
import type { Json } from "@/types/database";
import type {
  CatalogProduct,
  CatalogProductVariant,
  ProductCategory,
} from "@/types/product";

const categories: ProductCategory[] = [
  "Telefon",
  "Bilgisayar",
  "Tablet",
  "Akıllı Saat",
  "Kulaklık",
  "Aksesuar",
];
const accents: CatalogProduct["accent"][] = [
  "graphite",
  "silver",
  "red",
  "blue",
  "cream",
  "black",
];

function attributes(value: Json): CatalogProductVariant["attributes"] {
  if (!value || Array.isArray(value) || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string | number | boolean] =>
        ["string", "number", "boolean"].includes(typeof entry[1]),
    ),
  );
}

export function mapSupabaseProduct(row: SupabaseCatalogRow): CatalogProduct {
  const fallback = catalogProducts.find((product) => product.slug === row.slug);
  const sortedImages = row.images
    .filter((image) => image.color_id == null)
    .sort(
      (a, b) =>
        Number(b.is_primary) - Number(a.is_primary) ||
        a.sort_order - b.sort_order,
    );
  const oldPrice = row.old_price === null ? undefined : Number(row.old_price);
  const price = Number(row.price);
  const installmentCount = row.installment_count ?? 3;
  const discountRate =
    oldPrice && oldPrice > price
      ? Math.round(((oldPrice - price) / oldPrice) * 100)
      : undefined;
  const category = categories.includes(row.category.name as ProductCategory)
    ? (row.category.name as ProductCategory)
    : "Aksesuar";
  const model = row.name
    .toLocaleLowerCase("tr-TR")
    .startsWith(row.brand.name.toLocaleLowerCase("tr-TR"))
    ? row.name.slice(row.brand.name.length).trim()
    : row.name;
  return {
    id: row.id,
    slug: row.slug,
    brand: row.brand.name,
    model,
    description: row.description ?? "",
    shortDescription: row.description ? plainText(row.description) : undefined,
    category,
    price,
    previousPrice: oldPrice,
    discountRate,
    monthlyInstallment: calculateMonthlyInstallment(price, installmentCount),
    installmentCount,
    showInstallments: row.show_installments === true,
    installmentNote: row.installment_note ?? undefined,
    stockStatus:
      row.availableStock === 0
        ? "out-of-stock"
        : row.availableStock <= 5
          ? "limited"
          : "in-stock",
    availableStock: row.availableStock,
    sameDayShipping: row.availableStock > 5,
    freeShipping: price >= 2500,
    rating: Number(row.rating),
    reviewCount: row.review_count,
    accent: fallback?.accent ?? accents[row.slug.length % accents.length],
    sku: row.sku,
    warrantyMonths: row.warranty_months,
    mainImageUrl: sortedImages[0]?.url,
    imageUrls: sortedImages.map((image) => image.url),
    colors: (row.colors ?? []).map((color) => ({
      id: color.id,
      name: color.name,
      displayName: color.display_name ?? color.name,
      hexCode: color.hex_code,
      imageUrls: row.images
        .filter((image) => image.color_id === color.id)
        .sort(
          (a, b) =>
            Number(b.is_primary) - Number(a.is_primary) ||
            a.sort_order - b.sort_order,
        )
        .map((image) => image.url),
    })),
    variants: (row.variants ?? [])
      .filter((variant) => variant.is_active)
      .map((variant) => ({
        id: variant.id,
        name: variant.name,
        sku: variant.sku,
        barcode: variant.barcode ?? undefined,
        price: Number(variant.price),
        previousPrice:
          variant.old_price === null ? undefined : Number(variant.old_price),
        stockQuantity: variant.stock_quantity,
        colorId: variant.color_id ?? undefined,
        storageValue: variant.storage_value ?? undefined,
        storageUnit: variant.storage_unit ?? undefined,
        isDefault: variant.is_default,
        sortOrder: variant.sort_order,
        attributes: attributes(variant.attributes),
      })),
  };
}
