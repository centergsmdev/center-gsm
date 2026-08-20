import type {
  InstallmentDocumentType,
  InstallmentProductSummary,
} from "@/lib/installment/types";

const REQUIRED_DOCUMENT_TYPES: InstallmentDocumentType[] = [
  "identity_front",
  "identity_back",
  "residence",
  "signature",
];

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string) {
  return UUID_PATTERN.test(value);
}

export function normalizeApplicantName(value: string) {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (
    normalized.length < 2 ||
    normalized.length > 120 ||
    /[\u0000-\u001f\u007f]/.test(normalized)
  )
    return null;
  return normalized;
}

export function normalizeTurkishPhone(value: string) {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("0090")) digits = digits.slice(4);
  else if (digits.startsWith("90")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return /^5\d{9}$/.test(digits) ? `+90${digits}` : null;
}

export function normalizeOptionalEmail(value: string) {
  const normalized = value.trim().toLocaleLowerCase("tr-TR");
  if (!normalized) return null;
  if (normalized.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized))
    return undefined;
  return normalized;
}

export function validateProductVariantSelection(
  product: { id: string; is_active: boolean },
  variants: Array<{
    id: string;
    product_id: string;
    is_active: boolean;
  }>,
  requestedVariantId: string | null,
) {
  if (!product.is_active) return "inactive_product" as const;
  const activeVariants = variants.filter(
    (variant) => variant.product_id === product.id && variant.is_active,
  );
  if (!requestedVariantId)
    return activeVariants.length ? ("variant_required" as const) : null;
  const variant = activeVariants.find((item) => item.id === requestedVariantId);
  if (!variant) return "invalid_variant" as const;
  return null;
}

export function productSummaryStorageLabel(summary: InstallmentProductSummary) {
  return summary.storageValue && summary.storageUnit
    ? `${summary.storageValue} ${summary.storageUnit}`
    : null;
}

export function missingInstallmentDocuments(
  documents: Partial<Record<InstallmentDocumentType, unknown>>,
) {
  return REQUIRED_DOCUMENT_TYPES.filter((type) => !documents[type]);
}
