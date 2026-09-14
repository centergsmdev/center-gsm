export const WHATSAPP_REPRESENTATIVE_BUCKET = "whatsapp-representatives";
export const MAX_WHATSAPP_REPRESENTATIVE_IMAGE_SIZE = 4 * 1024 * 1024;

export const DEFAULT_WHATSAPP_MESSAGE =
  "Merhaba, CENTER GSM üzerinden bilgi almak istiyorum.";

export function normalizeWhatsAppPhone(value?: string | null) {
  let digits = (value ?? "").replace(/\D/g, "");

  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 10) digits = `90${digits}`;
  else if (digits.length === 11 && digits.startsWith("0"))
    digits = `90${digits.slice(1)}`;

  return /^\d{8,15}$/.test(digits) && !digits.startsWith("0")
    ? `+${digits}`
    : null;
}

export function buildWhatsAppHref(
  phone?: string | null,
  message = DEFAULT_WHATSAPP_MESSAGE,
) {
  const normalized = normalizeWhatsAppPhone(phone);
  if (!normalized) return null;
  return `https://wa.me/${normalized.slice(1)}?text=${encodeURIComponent(message)}`;
}

export function formatWhatsAppPhone(value?: string | null) {
  const normalized = normalizeWhatsAppPhone(value);
  if (!normalized) return value?.trim() ?? "";
  const digits = normalized.slice(1);
  if (digits.startsWith("90") && digits.length === 12) {
    const local = digits.slice(2);
    return `0${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6, 8)} ${local.slice(8)}`;
  }
  return normalized;
}

export function representativeInitials(fullName: string) {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  return words
    .slice(0, 2)
    .map((word) => word[0]?.toLocaleUpperCase("tr-TR") ?? "")
    .join("");
}
