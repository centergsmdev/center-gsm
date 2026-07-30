type CombinationColor = { id: string; is_active: boolean };
type CombinationStorage = { value: number; unit: "GB" | "TB" };
type CombinationVariant = {
  id: string;
  color_id: string | null;
  storage_value: number | null;
  storage_unit: "GB" | "TB" | null;
  sku: string;
  barcode: string | null;
  price: number;
  old_price: number | null;
  stock_quantity: number;
  is_active: boolean;
  is_default: boolean;
  sort_order: number;
};

export type BulkVariantAction =
  "add-tax" | "adjust-price" | "set-old-price" | "set-stock" | "apply-discount";

export function roundMoney(amount: number) {
  return Math.max(0, Math.round((amount + Number.EPSILON) * 100) / 100);
}

export function applyBulkVariantUpdate<T extends CombinationVariant>(
  variants: T[],
  action: BulkVariantAction,
  value: number,
): T[] {
  return variants.map((variant) => {
    if (action === "add-tax")
      return {
        ...variant,
        price: roundMoney(variant.price * (1 + value / 100)),
      };
    if (action === "adjust-price")
      return { ...variant, price: roundMoney(variant.price + value) };
    if (action === "set-old-price")
      return { ...variant, old_price: value > 0 ? roundMoney(value) : null };
    if (action === "apply-discount")
      return variant.is_active && variant.old_price && variant.old_price > 0
        ? {
            ...variant,
            price: roundMoney(variant.old_price * (1 - value / 100)),
          }
        : variant;
    return { ...variant, stock_quantity: Math.max(0, Math.trunc(value)) };
  });
}

export function discountApplicationSummary(variants: CombinationVariant[]) {
  const activeVariants = variants.filter((variant) => variant.is_active);
  const applied = variants.filter(
    (variant) =>
      variant.is_active && variant.old_price && variant.old_price > 0,
  ).length;
  return { applied, skipped: activeVariants.length - applied };
}

export function normalizeVariantDraft<T extends CombinationVariant>(
  variant: T,
): T {
  return {
    ...variant,
    sku: String(variant.sku ?? "")
      .trim()
      .replace(/\s+/g, " "),
    barcode:
      String(variant.barcode ?? "")
        .trim()
        .replace(/\s+/g, " ") || null,
  };
}

export function buildVariantCombinations(
  colors: CombinationColor[],
  storages: CombinationStorage[],
  variants: CombinationVariant[],
  createId: () => string,
) {
  const existing = new Map(
    variants.map((variant) => [
      `${variant.color_id}-${variant.storage_value}-${variant.storage_unit}`,
      variant,
    ]),
  );
  return colors
    .filter((color) => color.is_active)
    .flatMap((color) =>
      storages.map(
        (storage) =>
          existing.get(`${color.id}-${storage.value}-${storage.unit}`) ?? {
            id: `new-${createId()}`,
            color_id: color.id,
            storage_value: storage.value,
            storage_unit: storage.unit,
            sku: "",
            barcode: null,
            price: 0,
            old_price: null,
            stock_quantity: 0,
            is_active: true,
            is_default: false,
            sort_order: 0,
          },
      ),
    )
    .map((variant, index) => ({ ...variant, sort_order: index }));
}

export function validateVariantSetup(
  colors: Array<CombinationColor & { name: string; hex_code: string }>,
  variants: CombinationVariant[],
) {
  if (colors.some((color) => !color.name.trim()))
    return "Renk adı boş bırakılamaz.";
  if (colors.some((color) => !/^#[0-9A-Fa-f]{6}$/.test(color.hex_code)))
    return "Tüm renkler #RRGGBB biçiminde geçerli HEX koduna sahip olmalıdır.";
  const colorNames = colors.map((color) =>
    color.name.trim().toLocaleLowerCase("tr-TR"),
  );
  if (new Set(colorNames).size !== colorNames.length)
    return "Aynı renk adı bir ürün içinde tekrar kullanılamaz.";
  const combinations = variants.map(
    (item) => `${item.color_id}-${item.storage_value}-${item.storage_unit}`,
  );
  if (new Set(combinations).size !== combinations.length)
    return "Aynı renk ve depolama kombinasyonu tekrar eklenemez.";
  const skus = variants
    .map((item) => String(item.sku ?? "").trim())
    .filter(Boolean);
  if (skus.length !== variants.length || new Set(skus).size !== skus.length)
    return "Her varyantın benzersiz bir SKU değeri olmalıdır.";
  const barcodes = variants.map((item) => item.barcode?.trim()).filter(Boolean);
  if (new Set(barcodes).size !== barcodes.length)
    return "Aynı barkod birden fazla varyantta kullanılamaz.";
  if (
    variants.some(
      (item) =>
        !Number.isFinite(item.price) ||
        !Number.isInteger(item.stock_quantity) ||
        item.price < 0 ||
        item.stock_quantity < 0 ||
        (item.old_price !== null && item.old_price < item.price),
    )
  )
    return "Fiyat, eski fiyat veya stok değerlerini kontrol edin.";
  if (variants.filter((item) => item.is_default).length > 1)
    return "Yalnızca bir varsayılan varyant seçilebilir.";
  if (variants.some((item) => item.is_default && !item.is_active))
    return "Varsayılan varyant aktif olmalıdır.";
  return "";
}
