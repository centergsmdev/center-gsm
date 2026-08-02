import type {
  CatalogProduct,
  CatalogProductColor,
  CatalogProductVariant,
} from "@/types/product";
import { calculateMonthlyInstallment } from "@/lib/catalog/installments";

export function variantStorageKey(variant: CatalogProductVariant) {
  return variant.storageValue && variant.storageUnit
    ? `${variant.storageValue}-${variant.storageUnit}`
    : undefined;
}

export function resolveSelectedVariant(
  variants: CatalogProductVariant[],
  colorId?: string,
  storage?: string,
) {
  return variants.find(
    (variant) =>
      (!colorId || variant.colorId === colorId) &&
      (!storage || variantStorageKey(variant) === storage),
  );
}

export function storageKeyFromParam(
  variants: CatalogProductVariant[],
  value: string | null,
) {
  if (!value) return undefined;
  const exact = variants.find(
    (variant) => variantStorageKey(variant) === value,
  );
  if (exact) return variantStorageKey(exact);
  const legacy = variants.find(
    (variant) => variant.storageValue && `${variant.storageValue}` === value,
  );
  return legacy ? variantStorageKey(legacy) : undefined;
}

export function resolveDefaultVariant(
  variants: CatalogProductVariant[],
  colors: CatalogProductColor[],
) {
  return variants.find(
    (variant) =>
      variant.isDefault &&
      (!variant.colorId ||
        colors.some((color) => color.id === variant.colorId)),
  );
}

export function applyDefaultVariantPresentation(product: CatalogProduct) {
  const colors = product.colors ?? [];
  const defaultVariant = resolveDefaultVariant(product.variants ?? [], colors);
  if (!defaultVariant) return product;

  const color = colors.find((item) => item.id === defaultVariant.colorId);
  const price = defaultVariant.price;
  const previousPrice = defaultVariant.previousPrice;
  const stockQuantity = defaultVariant.stockQuantity;
  return {
    ...product,
    price,
    previousPrice,
    discountRate:
      previousPrice && previousPrice > price
        ? Math.round(((previousPrice - price) / previousPrice) * 100)
        : undefined,
    monthlyInstallment: calculateMonthlyInstallment(
      price,
      product.installmentCount,
    ),
    availableStock: stockQuantity,
    stockStatus:
      stockQuantity === 0
        ? ("out-of-stock" as const)
        : stockQuantity <= 5
          ? ("limited" as const)
          : ("in-stock" as const),
    sameDayShipping: stockQuantity > 5,
    freeShipping: price >= 2500,
    sku: defaultVariant.sku,
    mainImageUrl: color?.imageUrls[0] ?? product.mainImageUrl,
    imageUrls: color?.imageUrls.length ? color.imageUrls : product.imageUrls,
  };
}

export function resolveInitialVariantSelection(
  variants: CatalogProductVariant[],
  colors: CatalogProductColor[],
  colorParam: string | null,
  storageParam: string | null,
) {
  const colorId = colors.find((color) => color.name === colorParam)?.id;
  const storageKey = storageKeyFromParam(variants, storageParam);
  const hasUrlSelection = Boolean(colorId || storageKey);
  const urlCombinationExists = variants.some(
    (variant) =>
      (!colorId || variant.colorId === colorId) &&
      (!storageKey || variantStorageKey(variant) === storageKey),
  );

  if (hasUrlSelection && urlCombinationExists) return { colorId, storageKey };

  const defaultVariant = resolveDefaultVariant(variants, colors);
  return defaultVariant
    ? {
        colorId: defaultVariant.colorId,
        storageKey: variantStorageKey(defaultVariant),
      }
    : { colorId: undefined, storageKey: undefined };
}
