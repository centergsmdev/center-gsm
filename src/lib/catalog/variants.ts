import type { CatalogProductVariant } from "@/types/product";

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
