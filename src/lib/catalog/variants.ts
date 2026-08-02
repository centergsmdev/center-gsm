import type {
  CatalogProductColor,
  CatalogProductVariant,
} from "@/types/product";

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

  const defaultVariant = variants.find(
    (variant) =>
      variant.isDefault &&
      (!variant.colorId ||
        colors.some((color) => color.id === variant.colorId)),
  );
  return defaultVariant
    ? {
        colorId: defaultVariant.colorId,
        storageKey: variantStorageKey(defaultVariant),
      }
    : { colorId: undefined, storageKey: undefined };
}
